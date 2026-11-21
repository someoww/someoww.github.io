/* Runs before first paint so the page never flashes the wrong theme. */
(function () {
  var s = null;
  try { s = localStorage.getItem('ms-theme'); } catch (e) {}
  var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var t = (s === 'light' || s === 'dark') ? s : (dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1815' : '#e4ece7');
})();
