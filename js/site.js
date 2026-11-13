/* Shared behaviour: theme, sticky bar, Dhaka clock, copy email. */
(function () {
  'use strict';

  var root = document.documentElement;
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  var metaScheme = document.querySelector('meta[name="color-scheme"]');
  var toggle = document.getElementById('themeToggle');
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  var THEME_COLORS = { light: '#eef0ea', dark: '#131816' };

  function systemTheme() {
    if (mql) return mql.matches ? 'dark' : 'light';
    var hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }

  function applyTheme(theme, schemeMetaContent) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[theme]);
    if (metaScheme && schemeMetaContent) metaScheme.setAttribute('content', schemeMetaContent);
    if (toggle) {
      toggle.setAttribute('aria-label', 'Dark mode');
      toggle.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    }
  }

  var initialSaved = null;
  try { initialSaved = localStorage.getItem('ms-theme'); } catch (e) {}
  var initialHasOverride = (initialSaved === 'light' || initialSaved === 'dark');
  applyTheme(root.getAttribute('data-theme') || 'light', initialHasOverride ? initialSaved : 'light dark');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      var sys = systemTheme();
      if (next === sys) {
        applyTheme(next, 'light dark');
        try { localStorage.removeItem('ms-theme'); } catch (e) {}
      } else {
        applyTheme(next, next);
        try { localStorage.setItem('ms-theme', next); } catch (e) {}
      }
    });
  }

  if (mql) {
    var onSchemeChange = function () {
      var saved = null;
      try { saved = localStorage.getItem('ms-theme'); } catch (e) {}
      if (saved !== 'light' && saved !== 'dark') {
        applyTheme(systemTheme(), 'light dark');
      }
    };
    if (mql.addEventListener) mql.addEventListener('change', onSchemeChange);
    else if (mql.addListener) mql.addListener(onSchemeChange);
  }

  window.addEventListener('storage', function (event) {
    if (!event || event.key === 'ms-theme' || event.key === null) {
      var saved = null;
      try { saved = localStorage.getItem('ms-theme'); } catch (e) {}
      var hasOverride = (saved === 'light' || saved === 'dark');
      applyTheme(hasOverride ? saved : systemTheme(), hasOverride ? saved : 'light dark');
    }
  });

  /* Sticky bar fallback where CSS scroll-state queries are unsupported. */
  var bar = document.getElementById('topbar');
  if (bar && !(window.CSS && CSS.supports('container-type', 'scroll-state'))) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
    bar.parentNode.insertBefore(sentinel, bar);
    var observer = new IntersectionObserver(function (entries) {
      bar.classList.toggle('stuck', entries[0].intersectionRatio === 0);
    }, { threshold: [0, 1] });
    observer.observe(sentinel);
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

  /* Copy the address without opening a mail client (Invoker Commands + fallback). */
  var copyTimers = new WeakMap();
  var lastMessage = '';

  function reportCopy(button, ok, defaultLabel) {
    clearTimeout(copyTimers.get(button));
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');

    var status = button.nextElementSibling;
    var message = ok ? 'Copied' : 'Copy failed';
    if (message === lastMessage) message += '\u00A0';
    lastMessage = message;

    if (status && status.getAttribute('role') === 'status') {
      status.textContent = '';
      requestAnimationFrame(function () { status.textContent = message; });
    }

    button.textContent = ok ? 'copied' : 'failed';
    button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
    copyTimers.set(button, setTimeout(function () {
      button.textContent = defaultLabel;
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      if (status && status.getAttribute('role') === 'status') status.textContent = '';
    }, 1800));
  }

  function runCopy(button, target) {
    var defaultLabel = button.getAttribute('data-label') || 'copy';
    if (!button.hasAttribute('data-label')) button.setAttribute('data-label', button.textContent.trim());
    defaultLabel = button.getAttribute('data-label');

    var text = button.getAttribute('data-copy') || (target ? target.innerText.trim() : '');
    if (!text) return;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      reportCopy(button, false, defaultLabel);
      return;
    }

    navigator.clipboard.writeText(text).then(
      function () { reportCopy(button, true, defaultLabel); },
      function () { reportCopy(button, false, defaultLabel); }
    );
  }

  document.addEventListener('command', function (event) {
    if (event.command === '--copy' && event.source) {
      runCopy(event.source, event.target);
    }
  }, true);

  if (!('CommandEvent' in window)) {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('button[command="--copy"], button[data-copy]');
      if (!button) return;
      var targetId = button.getAttribute('commandfor');
      var target = targetId ? document.getElementById(targetId) : null;
      runCopy(button, target);
    });
  } else {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-copy]:not([command])');
      if (!button) return;
      runCopy(button, null);
    });
  }
})();
