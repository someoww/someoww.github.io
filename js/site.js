/* Shared behaviour: theme, sticky bar, Dhaka clock, copy email. */
(function () {
  'use strict';

  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  var toggle = document.getElementById('themeToggle');

  var THEME_COLORS = { light: '#eef0ea', dark: '#131816' };

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
    if (toggle) {
      toggle.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
    }
  }

  applyTheme(root.getAttribute('data-theme') || 'light');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('ms-theme', next); } catch (e) {}
    });
  }

  /* Sticky bar gains its hairline only once the page moves. */
  var bar = document.getElementById('topbar');
  if (bar) {
    var onScroll = function () {
      bar.classList.toggle('stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Dhaka time, quietly. */
  var clock = document.getElementById('clock');
  if (clock) {
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) { fmt = null; }
    var tick = function () {
      var now = new Date();
      clock.textContent = fmt ? fmt.format(now) + ' local' : now.toTimeString().slice(0, 5);
    };
    tick();
    setInterval(tick, 20000);
  }

  /* Copy the address without opening a mail client. */
  var copy = document.querySelector('[data-copy]');
  if (copy) {
    copy.addEventListener('click', function () {
      var value = copy.getAttribute('data-copy');
      var done = function () {
        copy.textContent = 'copied';
        copy.classList.add('done');
        setTimeout(function () {
          copy.textContent = 'copy';
          copy.classList.remove('done');
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, done);
      } else {
        done();
      }
    });
  }
})();
