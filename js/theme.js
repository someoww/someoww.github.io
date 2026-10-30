/* Runs before paint so the page never flashes the wrong theme. */
(function () {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('ms-theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else {
      var hour = new Date().getHours();
      theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme);
})();
