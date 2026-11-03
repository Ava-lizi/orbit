/* Shared by the static reader and the local content exporter. No execution of author content. */
globalThis.OrbitGrandArchiveCore = (() => {
  const categories = ['独立网站', '软件应用', '创意编程', '数字艺术', '交互设计', '跨学科项目'];
  const sections = {background: '项目背景', motivation: '创作动机', concept: '设计理念', technology: '技术方案', process: '开发过程', outcome: '最终成果', challenges: '遇到的问题', reflection: '个人总结'};
  const planets = ['mercury', 'venus', 'earth', 'mars', 'saturn', 'neptune'];
  const imagePath = /^\.\/public\/jupiter\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
  const isSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function safeUrl(value, repository = false) {
    if (typeof value !== 'string' || value !== value.trim() || !value.startsWith('https://')) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
      if (repository && (url.hostname !== 'github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname))) return null;
      return url.href;
    } catch { return null; }
  }
  function relatedRoute(link, catalog) {
    if (!planets.includes(link.planet)) return null;
    if (!link.recordId) return '#/' + link.planet;
    if (!isSlug(link.recordId) || link.planet === 'venus') return null;
    const entry = catalog[link.planet]?.find(r => r.id === link.recordId);
    if (!entry) return null;
    const key = link.planet === 'earth' ? entry.id : link.planet === 'saturn' ? entry.id : entry.slug;
    if (!isSlug(key)) return null;
    const segment = {earth: 'photo', mercury: 'entry', mars: 'record', saturn: 'record', neptune: 'article'}[link.planet];
    return '#/' + link.planet + '/' + segment + '/' + encodeURIComponent(key);
  }
  return Object.freeze({categories, sections, planets, imagePath, isSlug, validDate, safeUrl, relatedRoute});
})();
