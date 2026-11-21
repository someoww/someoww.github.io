/* Shared behaviour: theme switch, the cat's eyes, petting, copy email. */
(function () {
  'use strict';

  var root = document.documentElement;
  var mql = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  var toggle = document.getElementById('mode');
  var meta = document.querySelector('meta[name="theme-color"]');
  var COLORS = { light: '#e4ece7', dark: '#0e1815' };

  function saved() {
    try {
      var s = localStorage.getItem('ms-theme');
      return (s === 'light' || s === 'dark') ? s : null;
    } catch (e) { return null; }
  }
  function systemTheme() { return mql && mql.matches ? 'dark' : 'light'; }
  function paint(t) {
    root.setAttribute('data-theme', t);
    if (meta) meta.setAttribute('content', COLORS[t]);
    if (toggle) toggle.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
  }
  paint(saved() || systemTheme());

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      paint(next);
      try { localStorage.setItem('ms-theme', next); } catch (e) {}
    });
  }
  if (mql) {
    var onSchemeChange = function () { if (!saved()) paint(systemTheme()); };
    if (mql.addEventListener) mql.addEventListener('change', onSchemeChange);
    else if (mql.addListener) mql.addListener(onSchemeChange);
  }
  window.addEventListener('storage', function (event) {
    if (!event || event.key === 'ms-theme' || event.key === null) {
      paint(saved() || systemTheme());
    }
  });

  /* ---------- the cat ---------- */
  var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var heads = cats.map(function (c) { return c.querySelector('.head'); });
  var frame = 0;

  function setLook(cat, x, y) {
    cat.style.setProperty('--lx', x.toFixed(2));
    cat.style.setProperty('--ly', y.toFixed(2));
  }

  /* Eyes follow the pointer. Offsets are in the cat's own units, so they scale with it. */
  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        cats.forEach(function (cat, i) {
          if (!heads[i]) return;
          var r = heads[i].getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          var dist = Math.hypot(dx, dy) || 1;
          var m = Math.min(1, dist / (r.width * 1.2));
          setLook(cat, (dx / dist) * m * 9, (dy / dist) * m * 7);
        });
      });
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      cats.forEach(function (cat) { setLook(cat, 0, 0); });
    });
  }

  /* Petting: ears twitch, eyes squeeze shut. */
  function pet(cat) {
    cat.classList.add('happy');
    clearTimeout(cat._t);
    cat._t = setTimeout(function () { cat.classList.remove('happy'); }, 1500);
    cat.classList.remove('twitch');
    void cat.getBoundingClientRect();
    cat.classList.add('twitch');
    clearTimeout(cat._tw);
    cat._tw = setTimeout(function () { cat.classList.remove('twitch'); }, 600);
  }

  cats.forEach(function (cat) {
    cat.addEventListener('click', function () { pet(cat); });
    cat.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        pet(cat);
      } else if (event.key === ' ') {
        event.preventDefault();
      }
    });
    cat.addEventListener('keyup', function (event) {
      if (event.key === ' ') {
        event.preventDefault();
        pet(cat);
      }
    });
  });

  /* ---------- copy email ---------- */
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  Array.prototype.forEach.call(document.querySelectorAll('button[data-copy]'), function (button) {
    var label = button.getAttribute('data-label') || button.textContent.trim() || 'copy';
    var timer = 0;

    function report(ok) {
      var status = button.nextElementSibling;
      if (!status || status.getAttribute('role') !== 'status') status = null;

      clearTimeout(timer);
      button.textContent = ok ? 'copied' : 'failed';
      if (ok) {
        button.setAttribute('data-copied', '');
        button.removeAttribute('data-failed');
      } else {
        button.setAttribute('data-failed', '');
        button.removeAttribute('data-copied');
      }
      if (status) status.textContent = ok ? 'Email address copied' : 'Copy failed';

      timer = setTimeout(function () {
        button.textContent = label;
        button.removeAttribute('data-copied');
        button.removeAttribute('data-failed');
        if (status) status.textContent = '';
      }, 1800);
    }

    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy') || '';
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { report(true); },
          function () { report(fallbackCopy(text)); }
        );
      } else {
        report(fallbackCopy(text));
      }
    });
  });
})();
