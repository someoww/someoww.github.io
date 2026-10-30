/* Projects page: the synthetic network and the causal panel. */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG_NS = 'http://www.w3.org/2000/svg';

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
  var N = 31;
  var degradedSet = { 3: 1, 7: 1, 11: 1, 15: 1, 19: 1, 23: 1, 27: 1 };
  var criticalIndex = 17;
  var nodes = [];
  var i;

  for (i = 0; i < N; i++) {
    var angle = i * 2.399963229728653;
    var radius = 34 + 236 * Math.sqrt((i + 0.5) / N);
    var x = 320 + Math.cos(angle) * radius + (rand() - 0.5) * 22;
    var y = 300 + Math.sin(angle) * radius * 0.84 + (rand() - 0.5) * 20;

    var kind = i === criticalIndex ? 'critical' : (degradedSet[i] ? 'degraded' : 'normal');
    var score = kind === 'critical'
      ? 38 + Math.round(rand() * 9)
      : kind === 'degraded'
        ? 52 + Math.round(rand() * 20)
        : 78 + Math.round(rand() * 18);
    var delay = (100 - score) * 0.32 + 1.5 + rand() * 4;

    nodes.push({
      index: i,
      id: 'D-' + (i + 1 < 10 ? '0' : '') + (i + 1),
      x: x,
      y: y,
      kind: kind,
      score: score,
      delay: delay,
      r: 4.3 + rand() * 1.5
    });
  }

  var COLOR = {
    normal: 'var(--ok)',
    degraded: 'var(--warn)',
    critical: 'var(--oxide)'
  };

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
    var group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', 'mapGroup');

    var edgeLayer = document.createElementNS(SVG_NS, 'g');
    var flowLayer = document.createElementNS(SVG_NS, 'g');
    var nodeLayer = document.createElementNS(SVG_NS, 'g');
    group.appendChild(edgeLayer);
    group.appendChild(flowLayer);
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
        edges.push({ a: a, b: item.b, key: key });
      });
    });

    /* a few long-haul links so the network does not read as a chain */
    for (i = 0; i < N; i += 6) {
      var partner = (i + 13) % N;
      var key = Math.min(i, partner) + '-' + Math.max(i, partner);
      if (!seen[key] && i !== partner) {
        seen[key] = 1;
        edges.push({ a: nodes[i], b: nodes[partner], key: key });
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
      var d = curvePath(edge.a, edge.b, (rand() - 0.5) * 34);

      var base = document.createElementNS(SVG_NS, 'path');
      base.setAttribute('d', d);
      base.setAttribute('class', 'edge draw');
      base.setAttribute('pathLength', '1');
      base.style.animationDelay = (0.25 + index * 0.022).toFixed(2) + 's';
      edgeLayer.appendChild(base);

      if (index % 6 === 0) {
        var flow = document.createElementNS(SVG_NS, 'path');
        flow.setAttribute('d', d);
        flow.setAttribute('class', 'edge flow');
        flow.style.animationDelay = (1.1 + (index % 4) * 0.35).toFixed(2) + 's, ' + (index * 0.7).toFixed(2) + 's';
        flowLayer.appendChild(flow);
      }
    });

    var pinned = nodes[criticalIndex];
    var current = pinned;

    function paintReadout(node) {
      current = node;
      roId.textContent = node.id;
      roScore.textContent = node.score;
      roCls.textContent = node.kind;
      roCls.setAttribute('data-cls', node.kind);
      roDelay.textContent = node.delay.toFixed(1) + ' h delay';
      readout.setAttribute('aria-label',
        node.id + ', ' + node.kind + ', condition score ' + node.score +
        ', average delay ' + node.delay.toFixed(1) + ' hours');
    }

    function dismissHint() {
      if (hint && !hint.classList.contains('gone')) hint.classList.add('gone');
    }

    var nodeEls = [];

    nodes.forEach(function (node, index) {
      var g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'node ' + node.kind);
      g.setAttribute('data-index', String(index));
      g.setAttribute('tabindex', index === criticalIndex ? '0' : '-1');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label',
        node.id + ', ' + node.kind + ', condition score ' + node.score +
        ', delay ' + node.delay.toFixed(1) + ' hours');
      g.style.animationDelay = (0.35 + index * 0.028).toFixed(2) + 's';

      if (node.kind === 'critical') {
        var pulse = document.createElementNS(SVG_NS, 'circle');
        pulse.setAttribute('class', 'pulse');
        pulse.setAttribute('cx', node.x);
        pulse.setAttribute('cy', node.y);
        pulse.setAttribute('r', '9');
        g.appendChild(pulse);
      }

      var halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('class', 'halo');
      halo.setAttribute('cx', node.x);
      halo.setAttribute('cy', node.y);
      halo.setAttribute('r', '15');
      halo.setAttribute('fill', COLOR[node.kind]);

      var ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('class', 'ring');
      ring.setAttribute('cx', node.x);
      ring.setAttribute('cy', node.y);
      ring.setAttribute('r', '9.5');

      var core = document.createElementNS(SVG_NS, 'circle');
      core.setAttribute('class', 'core');
      core.setAttribute('cx', node.x);
      core.setAttribute('cy', node.y);
      core.setAttribute('r', node.r.toFixed(2));
      core.setAttribute('fill', COLOR[node.kind]);
      if (node.kind !== 'normal') {
        core.style.filter = 'drop-shadow(0 0 5px ' + COLOR[node.kind] + ')';
      }

      g.appendChild(halo);
      g.appendChild(ring);
      g.appendChild(core);

      if (node.kind === 'critical') {
        var tag = document.createElementNS(SVG_NS, 'text');
        tag.setAttribute('x', (node.x + 9).toFixed(1));
        tag.setAttribute('y', (node.y - 8).toFixed(1));
        tag.setAttribute('class', 'node-tag');
        tag.textContent = node.id;
        g.appendChild(tag);
      }

      g.addEventListener('pointerenter', function () {
        if (window.matchMedia('(hover: hover)').matches) {
          paintReadout(node);
          dismissHint();
        }
      });
      g.addEventListener('focus', function () {
        paintReadout(node);
        dismissHint();
      });
      g.addEventListener('click', function () {
        pinned = node;
        paintReadout(node);
        dismissHint();
      });
      g.addEventListener('keydown', function (event) {
        var nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % N;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + N) % N;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = N - 1;
        else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pinned = node;
          paintReadout(node);
          return;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        nodeEls.forEach(function (el, n) {
          el.setAttribute('tabindex', n === nextIndex ? '0' : '-1');
        });
        nodeEls[nextIndex].focus();
      });

      nodeEls.push(g);
      nodeLayer.appendChild(g);
    });

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
        var oracle = Math.abs(parseFloat(row.getAttribute('data-oracle')));
        var decimals = parseInt(row.getAttribute('data-decimals'), 10) || 1;

        var bar = row.querySelector('.bar');
        var tick = row.querySelector('.tick');
        var val = row.querySelector('.val');

        bar.style.width = Math.min(100, (value / max) * 100).toFixed(2) + '%';
        tick.style.left = Math.min(100, (oracle / max) * 100).toFixed(2) + '%';
        tick.style.opacity = estimator === 'oracle' ? '0' : '0.6';
        val.textContent = format(parseFloat(row.getAttribute('data-' + estimator)), decimals);
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
        var done = function () {
          copyTable.textContent = 'Copied';
          copyTable.classList.add('done');
          setTimeout(function () {
            copyTable.textContent = 'Copy CSV';
            copyTable.classList.remove('done');
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lines.join('\n')).then(done, done);
        } else {
          done();
        }
      });
    }

    render('oracle', false);

    if (!reduce) {
      rows.forEach(function (row) {
        var bar = row.querySelector('.bar');
        bar.style.width = '0%';
      });
      requestAnimationFrame(function () {
        setTimeout(function () { render('oracle', false); }, 120);
      });
    }
  }
})();
