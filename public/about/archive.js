window.createOrbitArchive = function (root) {
  const { chapters, bodies, process, milestones } = window.ORBIT_ARCHIVE;
  const content = root.querySelector('.archive-content');
  const index = root.querySelector('.archive-index');
  const mobile = root.querySelector('.archive-select');
  const sections = [];
  const buttons = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let activeChapter = -1;
  let frame = 0;

  function text(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function paragraphs(parent, ...lines) {
    parent.append(...lines.map(line => text('p', line)));
  }

  function figure(path, alt, caption, width, height) {
    const wrapper = document.createElement('figure');
    const image = document.createElement('img');
    Object.assign(image, { src: path, alt, width, height, loading: 'lazy', decoding: 'async' });
    wrapper.append(image, text('figcaption', caption));
    return wrapper;
  }

  function orbitDrawing(className, withBodies = false) {
    const figure = document.createElement('div');
    figure.className = className;
    figure.setAttribute('aria-hidden', 'true');
    const ellipse = [38, 61, 86, 113, 144, 178, 215, 254].map((radius, i) => {
      const height = radius * .45;
      const angle = [-2, -.9, .26, 2.35, -2.85, -.48, 2.05, -1.48][i];
      const x = 280 + Math.cos(angle) * radius;
      const y = 148 + Math.sin(angle) * height;
      return `<ellipse cx="280" cy="148" rx="${radius}" ry="${height}"/>` +
        (withBodies ? `<circle cx="${x}" cy="${y}" r="3.5" fill="${bodies[i + 1][4]}"/>` : '');
    }).join('');
    figure.innerHTML = `<svg viewBox="0 0 560 296" fill="none"><g transform="rotate(-12 280 148)">${ellipse}
      <circle cx="280" cy="148" r="8" fill="#dfb27c"/></g></svg>`;
    return figure;
  }

  const render = {
    prologue(section) {
      section.append(orbitDrawing('archive-hero-orbits'));
      const intro = document.createElement('div');
      intro.className = 'archive-intro';
      paragraphs(intro, '总有一些零散的东西，值得被好好安放。',
        '一些代码，一些照片，一些不成熟的想法，还有那些偶然被记下的瞬间。',
        '它们不必被谁看见，也不必被谁理解。',
        '只是恰好，我想为它们留一个地方。');
      const scroll = text('button', '继续阅读 ↓', 'archive-scroll');
      scroll.type = 'button';
      scroll.addEventListener('click', () => goTo(1));
      section.append(intro, scroll);
    },
    origin(section) {
      paragraphs(section, 'ORBIT 的起点很简单。想给代码、照片、经历和那些尚未成形的念头，留一个可以长期回来的地方。',
        '这里首先属于创造它的人。一段文字可以留着以后再写，一张照片可以独自占据一页。它们被保存下来，因为当时想留下它们。',
        '当内容渐渐多起来，才有了这个问题。怎样安放它们，才能让不同的兴趣保持自己的节奏？太阳系给出了一个答案。');
    },
    name(section) {
      const quote = document.createElement('blockquote');
      const motto = text('p', 'We all have our own orbit.');
      motto.lang = 'en';
      quote.append(motto, text('p', '我们都有自己的轨道。'));
      section.append(quote, orbitDrawing('archive-name-orbits'));
      paragraphs(section, 'ORBIT 意为轨道。轨道记录着运行的方向、距离和周期。行星遵循同一片宇宙的规律，却沿各自的路径运动。',
        '每个人的热爱、选择和经历也有自己的轨迹。有时彼此接近，有时相隔很远。一次短暂的交汇，也可能改变之后的方向。');
    },
    manifesto(section) {
      const archive = document.createElement('article');
      archive.className = 'archive-manuscript';
      const date = text('time', '2026.11.01');
      date.dateTime = '2026-11-01';
      const source = text('p', '历史原稿 · 完成于 ', 'archive-meta');
      source.append(date);
      archive.append(source);
      paragraphs(archive, '以下为原始设计文稿的文字转录。文中的恒光与内容审核描述记录了当时的设想。恒光目前尚未正式开放。');
      const original = document.createElement('div');
      original.className = 'archive-original';
      const lines = window.ORBIT_MANIFESTO.trim().split('\n');
      original.append(text('h3', lines.shift()));
      let list = null;
      for (const line of lines) {
        const item = /^(\d+\. |\- )(.*)/.exec(line);
        if (item) {
          if (!list) {
            list = document.createElement(item[1] === '- ' ? 'ul' : 'ol');
            original.append(list);
          }
          list.append(text('li', item[2]));
          continue;
        }
        list = null;
        if (line.startsWith('### ')) original.append(text('h5', line.slice(4)));
        else if (line.startsWith('## ')) original.append(text('h4', line.slice(3)));
        else if (line.trim()) original.append(text('p', line));
      }
      archive.append(original);
      section.append(archive);
    },
    system(section) {
      paragraphs(section, '用行星组织内容，可以让每一种兴趣保留自己的结构与节奏。八颗行星各自保存一类创作和记录，太阳则为偶然发生的相遇留下一处空间。');
      const map = document.createElement('figure');
      map.append(orbitDrawing('archive-system-orbits', true), text('figcaption', '太阳系结构示意 · 从太阳向外排列 · 非天文比例'));
      section.append(map);
      const table = document.createElement('table');
      table.className = 'archive-bodies';
      const heading = table.createTHead().insertRow();
      for (const label of ['天体', '名称', '归档内容']) {
        const header = text('th', label);
        header.scope = 'col';
        heading.append(header);
      }
      const body = table.createTBody();
      for (const [planet, name, category, note, color] of bodies) {
        const row = body.insertRow();
        const planetCell = text('th', planet);
        planetCell.scope = 'row';
        planetCell.style.setProperty('--body-color', color);
        const details = text('td', category);
        details.append(text('span', note));
        row.append(planetCell, text('td', name), details);
      }
      section.append(table);
      paragraphs(section, '恒光留言系统尚未正式开放。');
    },
    process(section) {
      paragraphs(section, '这些记录按设计脉络排列。从如何打开一个空间，到如何在其中移动视线，每一步都回到同一件事。让形式服务于被保存的内容。');
      const sequence = document.createElement('ol');
      sequence.className = 'archive-sequence';
      process.forEach(([title, note], i) => {
        const item = document.createElement('li');
        item.append(text('h3', title), text('p', note));
        if (i === 5) item.append(figure('./public/about/observation.webp',
          '轨道之间总览中的海王星观测标注和底部索引', '开发预览 · 海王星观测，标注随天体投影移动', 1440, 900));
        if (i === 6) item.append(figure('./public/about/entry.webp',
          '地球俯冲结束时填满屏幕的陆地、云层与夜侧灯光', '开发预览 · 地球俯冲末段，摄影页加载时保留的近景', 1440, 900));
        sequence.append(item);
      });
      section.append(sequence);
    },
    timeline(section) {
      paragraphs(section, '时间线记下已经发生的变化。日期来自原稿、项目记录和本次开发中的明确节点。');
      const list = document.createElement('ol');
      list.className = 'archive-timeline';
      for (const { date, title, note, image, alt } of milestones) {
        const item = document.createElement('li');
        const time = text('time', date.replaceAll('-', '.'));
        time.dateTime = date;
        const entry = document.createElement('div');
        entry.append(text('h3', title), text('p', note));
        if (image) entry.append(figure(image, alt || title, title, 1440, 900));
        item.append(time, entry);
        list.append(item);
      }
      section.append(list);
    },
    continuation(section) {
      paragraphs(section, '这里没有预先写好的结局。',
        '有些想法会被实现，有些会停留在草稿里。',
        '有些轨道会继续延伸，有些也许会慢慢改变方向。',
        '但这没有关系。', 'ORBIT 会随着时间，继续生长。');
      const end = text('p', 'We all have our own orbit.', 'archive-last-line');
      end.lang = 'en';
      section.append(end);
    }
  };

  function highlight(i) {
    if (i === activeChapter) return;
    buttons[activeChapter]?.removeAttribute('aria-current');
    buttons[i].setAttribute('aria-current', 'location');
    mobile.selectedIndex = i;
    activeChapter = i;
  }

  function refresh() {
    if (root.hidden) return;
    const edge = root.querySelector('.archive-header').getBoundingClientRect().bottom + 36;
    let i = 0;
    for (const [position, section] of sections.entries()) {
      if (section.getBoundingClientRect().top > edge) break;
      i = position;
    }
    if (root.scrollTop > 0 && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) i = sections.length - 1;
    highlight(i);
  }

  function goTo(i) {
    const section = sections[i];
    if (!section) return;
    section.querySelector('h2').focus({ preventScroll: true });
    section.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    highlight(i);
  }

  chapters.forEach(([id, label, english, title], i) => {
    const number = String(i).padStart(2, '0');
    const button = text('button', number + ' / ' + label);
    button.type = 'button';
    button.addEventListener('click', () => goTo(i));
    buttons.push(button);
    index.append(button);
    mobile.append(new Option(number + ' / ' + label, id));

    const section = document.createElement('section');
    section.id = 'archive-' + id;
    section.className = 'archive-chapter archive-' + id;
    const heading = text('h2', title);
    heading.tabIndex = -1;
    if (i === 0) heading.id = 'aboutTitle';
    section.append(text('p', number + ' / ' + english, 'archive-kicker'), heading);
    if (i === 0) section.append(text('p', 'ORBIT / A PERSONAL DIGITAL UNIVERSE', 'archive-subtitle'));
    render[id](section);
    sections.push(section);
    content.append(section);
  });

  mobile.addEventListener('change', () => goTo(mobile.selectedIndex));
  root.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  }, { passive: true });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const visible = [...root.querySelectorAll('button, select')].filter(el => el.getClientRects().length);
    const first = visible[0], last = visible.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  highlight(0);
  return { refresh };
};
