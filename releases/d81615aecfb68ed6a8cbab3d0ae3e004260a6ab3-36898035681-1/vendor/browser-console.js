(() => {
  if (window.appConsole) return;
  const entries = [];
  const listeners = new Set();
  const format = value => {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  const add = (level, args) => {
    entries.push(`${new Date().toISOString()} [${level}] ${args.map(format).join(' ')}`.slice(0, 10000));
    if (entries.length > 300) entries.shift();
    for (const listener of listeners) { try { listener(entries.join('\n\n'), entries[entries.length - 1]); } catch { /* A panel listener must not break the app. */ } }
  };
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...args) => { original(...args); add(level, args); };
  }
  window.addEventListener('error', event => {
    if (event.target !== window) {
      const target = event.target;
      add('resource error', [target?.src || target?.href || target?.tagName]);
    } else add('uncaught error', [event.error || event.message, `${event.filename}:${event.lineno}:${event.colno}`]);
  }, true);
  window.addEventListener('unhandledrejection', event => add('unhandled promise', [event.reason]));
  window.appConsole = {
    subscribe(listener) { listeners.add(listener); listener(entries.join('\n\n')); return () => listeners.delete(listener); },
    clear() { entries.length = 0; for (const listener of listeners) listener(''); },
    inspect() {
      add('app snapshot', [{ url: location.href, online: navigator.onLine,
        viewport: { width: innerWidth, height: innerHeight },
        platform: window.Capacitor?.getPlatform?.() || 'web' }]);
    }
  };
  add('startup', [location.href, { online: navigator.onLine }]);
})();
