/* Projects page: the district network drawn inside the cat, and the estimator panel. */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---------------- deterministic world ---------------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(42);

  /* the cat's face, in the same units as the drawing on the home page */
  var EYES = [[-50, 0], [50, 0]];
  var NOSE = [0, 38];
  var EARS = [
    [[-105, -73], [-112, -170], [-33, -124]],
    [[105, -73], [112, -170], [33, -124]]
  ];

  function shrink(t, k) {
    var cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    var cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    return t.map(function (p) { return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]; });
  }
  function inTri(x, y, t) {
    var a = t[0], b = t[1], c = t[2];
    var d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    var l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
    var l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
    return l1 >= 0 && l2 >= 0 && (1 - l1 - l2) >= 0;
  }
  var earsIn = EARS.map(function (t) { return shrink(t, 0.7); });

  function inside(x, y) {
    if (Math.hypot(x - EYES[0][0], y) < 27 || Math.hypot(x - EYES[1][0], y) < 27) return false;
    if (Math.hypot(x, y) < 119) return true;
    return earsIn.some(function (t) { return inTri(x, y, t); });
  }

  /* Mitchell's best-candidate sampling: an even scatter of 30 districts, with the nose held back for the 31st. */
  var N = 31;
  var CRITICAL = 17;
  var placed = [NOSE.slice()];
  var n, k;
  for (n = 0; n < N - 1; n++) {
    var best = null, bestD = -1;
    for (k = 0; k < 30; k++) {
      var x, y, guard = 0;
      do {
        x = (rand() * 2 - 1) * 125;
        y = -168 + rand() * 296;
      } while (!inside(x, y) && ++guard < 400);
      var d = Infinity;
      for (var q = 0; q < placed.length; q++) {
        d = Math.min(d, Math.hypot(placed[q][0] - x, placed[q][1] - y));
      }
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    if (!best) best = [0, 0];
    placed.push(best);
  }
  var positions = placed.slice(1);
  positions.splice(CRITICAL, 0, NOSE.slice());

  var degradedSet = { 3: 1, 7: 1, 11: 1, 15: 1, 19: 1, 23: 1, 27: 1 };
  var nodes = positions.map(function (p, i) {
    var kind = i === CRITICAL ? 'critical' : (degradedSet[i] ? 'degraded' : 'normal');
    var score = kind === 'critical' ? 43
      : kind === 'degraded' ? 52 + Math.round(rand() * 20)
      : 78 + Math.round(rand() * 18);
    var delay = kind === 'critical' ? 19.7 : (100 - score) * 0.32 + 1.5 + rand() * 4;
    return {
      index: i,
      id: 'D-' + (i + 1 < 10 ? '0' : '') + (i + 1),
      x: p[0],
      y: p[1],
      kind: kind,
      score: score,
      delay: delay,
      r: kind === 'critical' ? 4.8 : 3.4 + rand() * 1.2
    };
  });

  /* ---------------- build the network ---------------- */
  var svg = document.getElementById('routeMap');
  var stage = document.getElementById('mapStage');
  var readout = document.getElementById('readout');
  var roId = document.getElementById('roId');
  var roScore = document.getElementById('roScore');
  var roCls = document.getElementById('roCls');
  var roDelay = document.getElementById('roDelay');
  var hint = document.getElementById('mapHint');

  if (svg && stage && readout) {
    var group = el('g', { id: 'mapGroup' });
    var edgeLayer = el('g', {});
    var nodeLayer = el('g', {});
    group.appendChild(edgeLayer);
    group.appendChild(nodeLayer);
    svg.appendChild(group);

    var seen = {};
    var edges = [];
    nodes.forEach(function (a) {
      var near = nodes
        .filter(function (b) { return b.index !== a.index; })
        .map(function (b) {
          return { b: b, d: Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) };
        })
        .sort(function (p, q) { return p.d - q.d; })
        .slice(0, 2);

      near.forEach(function (item) {
        var lo = Math.min(a.index, item.b.index);
        var hi = Math.max(a.index, item.b.index);
        var key = lo + '-' + hi;
        if (seen[key]) return;
        seen[key] = 1;
        edges.push({ a: a, b: item.b });
      });
    });

    /* a few long-haul links so the network does not read as a chain */
    for (n = 0; n < N; n += 6) {
      var partner = (n + 13) % N;
      var key = Math.min(n, partner) + '-' + Math.max(n, partner);
      if (!seen[key] && n !== partner) {
        seen[key] = 1;
        edges.push({ a: nodes[n], b: nodes[partner] });
      }
    }

    function curvePath(a, b, bend) {
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len;
      var ny = dx / len;
      var cx = mx + nx * bend;
      var cy = my + ny * bend;
      return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
             ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
             ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }

    edges.forEach(function (edge, index) {
      var path = el('path', {
        d: curvePath(edge.a, edge.b, (rand() - 0.5) * 30),
        class: 'edge',
        pathLength: '1'
      });
      path.style.animationDelay = (0.2 + index * 0.02).toFixed(2) + 's';
      edgeLayer.appendChild(path);
    });

    var pinned = nodes[CRITICAL];
    var current = pinned;

    function paintReadout(node) {
      current = node;
      if (roId) roId.textContent = node.id;
      if (roScore) roScore.textContent = node.score;
      if (roCls) {
        roCls.textContent = node.kind;
        roCls.setAttribute('data-cls', node.kind);
      }
      if (roDelay) roDelay.textContent = node.delay.toFixed(1) + ' h delay';
      readout.setAttribute('aria-label',
        node.id + ', ' + node.kind + ', condition score ' + node.score +
        ', average delay ' + node.delay.toFixed(1) + ' hours');
    }

    function dismissHint() {
      if (hint && !hint.classList.contains('gone')) hint.classList.add('gone');
    }

    var nodeEls = [];

    function pinNode(node, element) {
      pinned = node;
      nodeEls.forEach(function (item) { item.classList.remove('pinned'); });
      if (element) element.classList.add('pinned');
      paintReadout(node);
      dismissHint();
    }

    nodes.forEach(function (node, index) {
      var g = el('g', {
        class: 'node ' + node.kind,
        'data-index': String(index),
        tabindex: index === CRITICAL ? '0' : '-1',
        role: 'button',
        'aria-label': node.id + ', ' + node.kind + ', condition score ' + node.score +
          ', delay ' + node.delay.toFixed(1) + ' hours'
      });

      var hit = el('circle', { class: 'hit', cx: node.x, cy: node.y, r: '12' });
      var ring = el('circle', { class: 'ring', cx: node.x, cy: node.y, r: '9.5' });

      var glyph;
      if (node.kind === 'normal') {
        glyph = el('circle', { class: 'glyph', cx: node.x, cy: node.y, r: node.r.toFixed(2) });
      } else if (node.kind === 'degraded') {
        var t = node.r * 1.7;
        glyph = el('path', {
          class: 'glyph',
          d: 'M' + node.x.toFixed(1) + ' ' + (node.y - t).toFixed(1) +
             'L' + (node.x + t * 0.92).toFixed(1) + ' ' + (node.y + t * 0.72).toFixed(1) +
             'H' + (node.x - t * 0.92).toFixed(1) + 'Z'
        });
      } else {
        var d2 = node.r * 1.8;
        glyph = el('path', {
          class: 'glyph',
          d: 'M' + node.x.toFixed(1) + ' ' + (node.y - d2).toFixed(1) +
             'L' + (node.x + d2).toFixed(1) + ' ' + node.y.toFixed(1) +
             'L' + node.x.toFixed(1) + ' ' + (node.y + d2).toFixed(1) +
             'L' + (node.x - d2).toFixed(1) + ' ' + node.y.toFixed(1) + 'Z'
        });
      }
      glyph.style.animationDelay = (0.35 + index * 0.025).toFixed(2) + 's';

      g.appendChild(hit);
      g.appendChild(ring);
      g.appendChild(glyph);

      g.addEventListener('pointerenter', function () {
        if (window.matchMedia && matchMedia('(hover: hover)').matches) {
          paintReadout(node);
          dismissHint();
        }
      });
      g.addEventListener('focus', function () {
        paintReadout(node);
        dismissHint();
      });
      g.addEventListener('click', function () {
        pinNode(node, g);
      });
      g.addEventListener('keydown', function (event) {
        var nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % N;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + N) % N;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = N - 1;
        else if (event.key === 'Enter') {
          event.preventDefault();
          pinNode(node, g);
          return;
        } else if (event.key === ' ') {
          event.preventDefault();
          return;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        nodeEls.forEach(function (element, i) {
          element.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
        });
        nodeEls[nextIndex].focus();
      });
      g.addEventListener('keyup', function (event) {
        if (event.key === ' ') {
          event.preventDefault();
          pinNode(node, g);
        }
      });

      nodeEls.push(g);
      nodeLayer.appendChild(g);
    });

    if (nodeEls[CRITICAL]) nodeEls[CRITICAL].classList.add('pinned');
    paintReadout(pinned);

    stage.addEventListener('pointerleave', function () {
      if (current !== pinned) paintReadout(pinned);
      group.style.transform = '';
    });

    /* pointer parallax, very slight */
    if (!reduce) {
      var frame = 0;
      stage.addEventListener('pointermove', function (event) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = 0;
          var rect = stage.getBoundingClientRect();
          var dx = (event.clientX - rect.left) / rect.width - 0.5;
          var dy = (event.clientY - rect.top) / rect.height - 0.5;
          group.style.transform = 'translate(' + (dx * 8).toFixed(2) + 'px,' + (dy * 6).toFixed(2) + 'px)';
        });
      }, { passive: true });
    }
  }

  /* ---------------- causal estimator panel ---------------- */
  var causal = document.getElementById('causal');
  if (causal) {
    var rows = Array.prototype.slice.call(causal.querySelectorAll('.row'));
    var buttons = Array.prototype.slice.call(causal.querySelectorAll('.seg button'));
    var reading = document.getElementById('reading');
    var readingTimer = 0;

    var COPY = {
      oracle: '<b>The oracle.</b> The same simulated world, re-run with one input changed and every other noise stream held still. This is the number the other three are trying to recover.',
      naive: '<b>The naive answer.</b> A difference in means between rows that happen to differ. Confounding pulls it away from the truth, and for diesel and cold chain it overshoots by as much as three times.',
      backdoor: '<b>The backdoor estimate.</b> A g-formula that conditions on each treatment’s direct causes, then averages the contrast over the observed rows. It lands within about one or two standard errors of the oracle.',
      all: '<b>The predictor’s answer.</b> Adjusting for every dispatch-time column is what flipping an input inside the model amounts to. It controls away the channels the shock travels through, so the effect nearly vanishes.'
    };

    function format(value, decimals) {
      return value.toFixed(decimals).replace('-', '\u2212');
    }

    function render(estimator, animate) {
      causal.setAttribute('data-est', estimator);

      rows.forEach(function (row) {
        var value = Math.abs(parseFloat(row.getAttribute('data-' + estimator)));
        var max = parseFloat(row.getAttribute('data-max'));
        var oracleRaw = parseFloat(row.getAttribute('data-oracle'));
        var oracle = Math.abs(oracleRaw);
        var decimals = parseInt(row.getAttribute('data-decimals'), 10) || 1;

        var bar = row.querySelector('.bar');
        var tick = row.querySelector('.tick');
        var track = row.querySelector('.track');
        var val = row.querySelector('.val');

        bar.style.width = Math.min(100, (value / max) * 100).toFixed(2) + '%';
        tick.style.left = Math.min(100, (oracle / max) * 100).toFixed(2) + '%';
        tick.style.opacity = estimator === 'oracle' ? '0' : '0.6';
        val.textContent = format(parseFloat(row.getAttribute('data-' + estimator)), decimals);

        var oracleSr = track.querySelector('.oracle-sr');
        if (!oracleSr) {
          oracleSr = document.createElement('span');
          oracleSr.className = 'visually-hidden oracle-sr';
          track.appendChild(oracleSr);
        }
        oracleSr.textContent = estimator === 'oracle' ? '' : ' (oracle: ' + format(oracleRaw, decimals) + ')';
      });

      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', button.getAttribute('data-est') === estimator ? 'true' : 'false');
      });

      if (reading) {
        if (animate) {
          reading.style.opacity = '0';
          clearTimeout(readingTimer);
          readingTimer = setTimeout(function () {
            reading.innerHTML = COPY[estimator];
            reading.style.opacity = '1';
          }, 130);
        } else {
          reading.innerHTML = COPY[estimator];
        }
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        render(button.getAttribute('data-est'), true);
      });
    });

    var copyTable = document.getElementById('copyTable');
    if (copyTable) {
      var copyTimer = 0;
      var statusEl = copyTable.nextElementSibling && copyTable.nextElementSibling.getAttribute('role') === 'status'
        ? copyTable.nextElementSibling
        : null;

      var finishCopy = function (ok) {
        clearTimeout(copyTimer);
        copyTable.classList.toggle('done', ok);
        if (ok) {
          copyTable.setAttribute('data-copied', '');
          copyTable.removeAttribute('data-failed');
          copyTable.textContent = 'Copied';
        } else {
          copyTable.setAttribute('data-failed', '');
          copyTable.removeAttribute('data-copied');
          copyTable.textContent = 'Copy failed';
        }
        if (statusEl) statusEl.textContent = ok ? 'CSV copied' : 'Copy failed';
        copyTimer = setTimeout(function () {
          copyTable.textContent = 'Copy CSV';
          copyTable.classList.remove('done');
          copyTable.removeAttribute('data-copied');
          copyTable.removeAttribute('data-failed');
          if (statusEl) statusEl.textContent = '';
        }, 1800);
      };

      copyTable.addEventListener('click', function () {
        var estimator = causal.getAttribute('data-est') || 'oracle';
        var lines = ['question,outcome,estimator,value'];
        rows.forEach(function (row) {
          var question = row.querySelector('.q b').textContent;
          var outcome = row.querySelector('.q span').textContent;
          var value = row.getAttribute('data-' + estimator);
          lines.push([question, outcome, estimator, value].map(function (cell) {
            return '"' + String(cell).replace(/"/g, '""') + '"';
          }).join(','));
        });
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lines.join('\n')).then(
            function () { finishCopy(true); },
            function () { finishCopy(false); }
          );
        } else {
          finishCopy(false);
        }
      });
    }

    render('oracle', false);

    if (!reduce) {
      rows.forEach(function (row) {
        row.querySelector('.bar').style.width = '0%';
      });
      requestAnimationFrame(function () {
        setTimeout(function () { render('oracle', false); }, 120);
      });
    }
  }
})();
