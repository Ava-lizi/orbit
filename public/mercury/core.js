/* Pure, bounded browser algorithms. This file is also imported by local validation/tests. */
globalThis.OrbitMercuryCore = (() => {
  const categories = ['Python', '自动化', 'Web', '算法实验', '其他'];
  const statuses = ['开发中', '已完成', '实验性'];
  const imagePath = /^\.\/public\/mercury\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
  const isSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  function safeUrl(value, repository = false) {
    if (typeof value !== 'string' || value !== value.trim() || !value.startsWith('https://')) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
      if (repository && (url.hostname !== 'github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname))) return null;
      return url.href;
    } catch { return null; }
  }
  function binarySearchTrace(values, target) {
    if (!Array.isArray(values) || values.length > 64 || !Number.isSafeInteger(target) ||
      values.some((n, i) => !Number.isSafeInteger(n) || (i > 0 && n <= values[i - 1]))) {
      throw Error('Binary search requires at most 64 strictly increasing safe integers');
    }
    let low = 0, high = values.length - 1;
    const steps = [];
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      const outcome = values[mid] === target ? 'found' : values[mid] < target ? 'right' : 'left';
      steps.push({low, high, mid, value: values[mid], outcome});
      if (outcome === 'found') return {steps, result: mid, comparisons: steps.length};
      if (outcome === 'right') low = mid + 1; else high = mid - 1;
    }
    const comparisons = steps.length;
    steps.push({low, high, mid: null, value: null, outcome: 'missing'});
    return {steps, result: -1, comparisons};
  }
  // Highlight only text tokens; callers create text nodes, never parse highlighted HTML.
  function tokens(source, language = 'text') {
    const code = String(source);
    if (!['javascript', 'python'].includes(language)) return [{kind: 'plain', text: code}];
    const pattern = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|function|return|while|if|else|for|of|new|true|false|null|def|in|None|True|False|import|from|and|or|not|class|print)\b|\b\d+(?:\.\d+)?\b)/g;
    const result = []; let cursor = 0;
    for (const match of code.matchAll(pattern)) {
      if (match.index > cursor) result.push({kind: 'plain', text: code.slice(cursor, match.index)});
      const text = match[0];
      const kind = /^(\/\/|#)/.test(text) ? 'comment' : /^["']/.test(text) ? 'string' : /^\d/.test(text) ? 'number' : 'keyword';
      result.push({kind, text}); cursor = match.index + text.length;
    }
    if (cursor < code.length) result.push({kind: 'plain', text: code.slice(cursor)});
    return result;
  }
  return Object.freeze({categories, statuses, imagePath, isSlug, validDate, safeUrl, binarySearchTrace, tokens});
})();
