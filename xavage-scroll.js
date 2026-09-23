// XAVAGE scroll engine — shared by every page's logic class.
// Handles: word reveals, element reveals, counters, hero scrub, parallax, progress bar.

const EASE = 'cubic-bezier(.16,1,.3,1)';

function splitWords(el, stagger) {
  if (el.dataset.split === '1') return;
  el.dataset.split = '1';
  const nodes = Array.from(el.childNodes);
  const frag = document.createDocumentFragment();
  let i = 0;
  const push = (text, model) => {
    text.split(/\s+/).filter(Boolean).forEach(w => {
      const outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding:0 .08em .12em 0;margin:0 -.08em -.12em 0';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block;transform:translateY(115%);transition:transform 1s ' + EASE;
      inner.style.transitionDelay = (i++ * stagger) + 'ms';
      if (model) {
        const clone = model.cloneNode(false);
        clone.textContent = w;
        inner.appendChild(clone);
      } else {
        inner.textContent = w;
      }
      outer.appendChild(inner);
      frag.appendChild(outer);
      frag.appendChild(document.createTextNode(' '));
    });
  };
  nodes.forEach(n => {
    if (n.nodeType === 3) push(n.textContent, null);
    else if (n.nodeType === 1) push(n.textContent, n);
  });
  el.textContent = '';
  el.appendChild(frag);
}

function start(opts = {}) {
  const still = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const stagger = opts.stagger ?? 70;
  const scale = opts.scale ?? 1;
  let pending = [], counters = [], queued = false, timers = [];

  const hidden = el => {
    if (el.hasAttribute('data-words')) {
      const inner = el.querySelector('span > span');
      return !!inner && inner.style.transform !== 'none';
    }
    return parseFloat(getComputedStyle(el).opacity) < 0.9;
  };

  // Re-read the DOM every pass: React can re-render and restore the authored
  // opacity:0 / translateY on nodes we already revealed.
  const collect = () => {
    document.querySelectorAll('[data-words]').forEach(el => splitWords(el, stagger));
    pending = Array.from(document.querySelectorAll('[data-rv],[data-words]')).filter(hidden);
    counters = Array.from(document.querySelectorAll('[data-count]')).filter(el => el.dataset.ran !== '1');
  };

  const reveal = el => {
    if (el.hasAttribute('data-words')) {
      el.querySelectorAll('span > span').forEach(s => {
        s.style.transform = 'none';
        // drop the clip once the word has landed, so glows/italic tails aren't boxed
        const done = () => {
          if (s.parentNode) s.parentNode.style.overflow = 'visible';
          s.style.transition = 'none';   // lock the landed state in
        };
        s.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 1400 + parseFloat(s.style.transitionDelay || 0));
      });
    } else {
      el.style.opacity = '1';
      el.style.transform = 'none';
      setTimeout(() => { el.style.transition = 'none'; }, 1600);
    }
  };

  const countUp = el => {
    el.dataset.ran = '1';
    const end = +el.dataset.count, suf = el.dataset.suffix || '';
    const t0 = Date.now(), dur = 1400;
    el.textContent = '0' + suf;
    const iv = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
      if (k >= 1) clearInterval(iv);
    }, 32);
  };

  const scrollY = () => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  let lastY = scrollY();

  const frame = () => {
    const vh = window.innerHeight, y = scrollY();

    const header = document.querySelector('header');
    if (header) {
      if (y <= 80 || y < lastY - 2) header.style.transform = 'translateY(0)';
      else if (y > lastY + 2) header.style.transform = 'translateY(-100%)';
    }
    lastY = y;

    collect();
    if (pending.length) pending = pending.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -40) { reveal(el); return false; }
      return true;
    });
    if (counters.length) counters = counters.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) { countUp(el); return false; }
      return true;
    });

    const prog = document.querySelector('[data-prog]');
    if (prog) {
      const max = document.documentElement.scrollHeight - vh;
      prog.style.transform = 'scaleX(' + (max > 0 ? (y / max).toFixed(4) : 0) + ')';
    }
    if (still) { if (opts.onFrame) opts.onFrame(y, vh); return; }

    const rays = document.querySelector('[data-rays]');
    const copy = document.querySelector('[data-herocopy]');
    const cue = document.querySelector('[data-scrollcue]');
    const hp = Math.min(1, Math.max(0, y / (vh * 0.9)));
    const ease = hp * hp;
    if (rays) {
      rays.style.transform = 'translateX(-50%) scale(' + (1 + ease * 0.7 * scale).toFixed(3) + ') translateY(' + (-ease * 90 * scale).toFixed(1) + 'px)';
      rays.style.opacity = (0.76 * Math.max(0, 1 - hp * 0.85)).toFixed(3);
    }
    if (copy) {
      copy.style.transform = 'translateY(' + (-ease * 120 * scale).toFixed(1) + 'px) scale(' + (1 - ease * 0.055).toFixed(4) + ')';
      copy.style.opacity = Math.max(0, 1 - hp * 1.3).toFixed(3);
    }
    if (cue) cue.style.opacity = Math.max(0, 1 - hp * 4).toFixed(3);

    const mid = vh * 0.5;
    document.querySelectorAll('[data-par]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const d = (r.top + r.height / 2 - mid) / vh;
      el.style.transform = 'translateY(' + (d * (+el.dataset.par) * scale).toFixed(1) + 'px)';
    });

    if (opts.onFrame) opts.onFrame(y, vh);
  };

  // rAF alone is unreliable here (it pauses whenever the frame is not being painted),
  // so every scheduled pass has a timer fallback.
  const run = () => { queued = false; frame(); };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
    setTimeout(() => { if (queued) run(); }, 80);
  };
  const refresh = () => { collect(); frame(); };

  collect();
  if (still) {
    pending.forEach(reveal);
    counters.forEach(el => { el.dataset.ran = '1'; el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
    pending = []; counters = [];
  }
  frame();
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onScroll);
  // React re-renders can restore the authored hidden styles; re-check when the tree changes
  const mo = new MutationObserver(onScroll);
  mo.observe(document.body, { childList: true, subtree: true });
  const beat = setInterval(onScroll, 500);
  [120, 400, 1200].forEach(ms => timers.push(setTimeout(refresh, ms)));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  return {
    refresh,
    stop() {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      mo.disconnect();
      clearInterval(beat);
      timers.forEach(clearTimeout);
    }
  };
}
window.XavageScroll = { start };
