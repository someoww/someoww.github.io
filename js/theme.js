/* Runs before paint so the page never flashes the wrong theme. */
(function () {
  var root = document.documentElement;
  var metaScheme = document.querySelector('meta[name="color-scheme"]');
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function systemTheme() {
    if (mql) return mql.matches ? 'dark' : 'light';
    var hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }

  function syncTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem('ms-theme');
    } catch (e) {}

    var hasOverride = (saved === 'light' || saved === 'dark');
    var theme = hasOverride ? saved : systemTheme();

    root.setAttribute('data-theme', theme);
    if (metaScheme) {
      metaScheme.setAttribute('content', hasOverride ? saved : 'light dark');
    }
  }

  syncTheme();

  if (mql) {
    var onSchemeChange = function () {
      var saved = null;
      try {
        saved = localStorage.getItem('ms-theme');
      } catch (e) {}
      if (saved !== 'light' && saved !== 'dark') {
        syncTheme();
      }
    };
    if (mql.addEventListener) mql.addEventListener('change', onSchemeChange);
    else if (mql.addListener) mql.addListener(onSchemeChange);
  }

  window.addEventListener('storage', function (event) {
    if (!event || event.key === 'ms-theme' || event.key === null) {
      syncTheme();
    }
  });
})();
