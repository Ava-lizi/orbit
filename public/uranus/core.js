/* Shared authoring rules and inert route resolution for the future manuscript. */
globalThis.OrbitFutureCore = (() => {
  const categories = ['软件构想', '视觉创意', '交互实验', '未来计划', '其他想法'];
  const statuses = ['灵感', '酝酿中', '待探索', '暂时搁置', '已转化为项目'];
  const kinds = ['manuscript', 'blueprint', 'possibility'];
  const sections = {inspiration: '创意来源', description: '构想说明', problem: '想解决的问题', concept: '核心设计理念', approach: '初步实现思路', future: '未来可能的发展方向'};
  const imagePath = /^\.\/public\/uranus\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
  const isSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function relatedRoute(item, catalog) {
    if (item.status !== '已转化为项目' || !['mercury', 'mars', 'jupiter'].includes(item.relatedPlanet) || !isSlug(item.relatedProjectId)) return null;
    const record = catalog[item.relatedPlanet]?.find(r => r.id === item.relatedProjectId && r.visibility === 'published' && (item.relatedPlanet !== 'jupiter' || r.status === 'completed'));
    if (!record || !isSlug(record.slug)) return null;
    const segment = {mercury: 'entry', mars: 'record', jupiter: 'work'}[item.relatedPlanet];
    return {hash: '#/' + item.relatedPlanet + '/' + segment + '/' + encodeURIComponent(record.slug), title: record.title};
  }
  return Object.freeze({categories, statuses, kinds, sections, imagePath, isSlug, validDate, relatedRoute});
})();
