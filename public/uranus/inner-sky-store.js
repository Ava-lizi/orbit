/* The public future archive and the private sky have independent data sources. */
(() => {
  const databaseName = 'orbit.inner-sky:' + location.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  const collection = 'ideas';
  const depthScale = z => 1 / (1 + z * .32);

  function placeStar(ideas, random = Math.random) {
    if (!ideas.length) return {x: -.13, y: -.07, z: -.12};

    // Compare in the default projection so depth cannot hide close neighbors.
    const projected = ideas.map(({position: {x, y, z}}) => [x * depthScale(z), y * depthScale(z)]);
    const spread = Math.max(1, Math.sqrt(ideas.length / 54));
    let best;
    let clearance = -1;
    for (let attempt = 0; attempt < 36; attempt++) {
      const x = (random() * 2 - 1) * .65 * spread;
      const y = (random() * 2 - 1) * .34 * spread;
      let distance = Infinity;
      for (const [otherX, otherY] of projected) {
        distance = Math.min(distance, (x - otherX) ** 2 + (y - otherY) ** 2);
      }
      if (distance > clearance) {
        best = {x, y};
        clearance = distance;
      }
    }
    const z = (random() * 2 - 1) * .62;
    return {x: best.x / depthScale(z), y: best.y / depthScale(z), z};
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(collection, {keyPath: 'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transact(mode, read, apply) {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(collection, mode);
        const store = transaction.objectStore(collection);
        let result, error;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(error || transaction.error);
        const request = read(store);
        request.onsuccess = () => {
          try {
            result = apply(request.result, store);
          } catch (cause) {
            error = cause;
            transaction.abort();
          }
        };
      });
    } finally {
      db.close();
    }
  }

  function contents(title, body) {
    const value = {title: title.trim(), body: body.trim()};
    if (!value.body) throw new Error('正文不能为空。');
    return value;
  }

  function change(previous, apply) {
    return transact('readwrite', store => store.get(previous.id), (current, store) => {
      if (!current || current.updatedAt !== previous.updatedAt) {
        throw new Error('这颗星已在另一窗口更改。请关闭当前窗口中的编辑或确认框，刷新后重试。');
      }
      return apply(current, store);
    });
  }

  const list = () => transact('readonly', store => store.getAll(), result => result);

  async function create(title, body) {
    const value = contents(title, body);
    return transact('readwrite', store => store.getAll(), (ideas, store) => {
      const createdAt = new Date().toISOString();
      const idea = {
        id: crypto.randomUUID(),
        ...value, createdAt, updatedAt: createdAt,
        position: placeStar(ideas)
      };
      store.add(idea);
      return idea;
    });
  }

  async function update(previous, title, body) {
    const value = contents(title, body);
    return change(previous, (current, store) => {
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
      const idea = {...current, ...value, updatedAt};
      store.put(idea);
      return idea;
    });
  }

  function remove(previous) {
    return change(previous, (current, store) => store.delete(current.id));
  }

  function backup(ideas) {
    return JSON.stringify({format: 'orbit-inner-sky', version: 1, exportedAt: new Date().toISOString(), ideas}, null, 2);
  }

  function matches(idea, query) {
    return idea.title.toLowerCase().includes(query) || idea.body.toLowerCase().includes(query);
  }

  function label(idea) {
    const text = (idea.title || idea.body).replace(/\s+/g, ' ');
    const characters = Array.from(text);
    return characters.length > 42 ? characters.slice(0, 42).join('') + '…' : text;
  }

  window.OrbitInnerSkyStore = {list, create, update, remove, backup, matches, label, depthScale, databaseName, placeStar};
})();
