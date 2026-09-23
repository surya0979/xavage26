// XAVAGE easter egg — Bull / Bear. Locked until you close out a run on the trading floor.
// Themes are real CSS custom properties on <html data-theme>; see each page's helmet block.

const KEY = 'xav-theme-v2', UNLOCK = 'xav-egg-v2';
const THEMES = ['xav', 'bull', 'bear'];
const LABEL = { xav: 'Xavage', bull: 'Bull', bear: 'Bear' };
const ICON = {
  xav: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:10px;height:10px;flex:none"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  bull: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;flex:none"><path d="M8 12.5V4M4 8l4-4 4 4"/></svg>',
  bear: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;flex:none"><path d="M8 3.5V12M12 8l-4 4-4-4"/></svg>'
};
const ON_COLOR = { xav: 'var(--ink)', bull: '#10b981', bear: '#ef4444' };
const BAR = { xav: '#07060E', bull: '#f8fafc', bear: '#0b0f19' };

const store = (() => {
  try {
    localStorage.setItem('__xav', '1'); localStorage.removeItem('__xav');
    return { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  } catch (e) {
    const mem = {};
    return { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } };
  }
})();

function initTheme() {
  if (window.__xavTheme) return window.__xavTheme;
  const root = document.documentElement;

  const pill = document.createElement('div');
  pill.style.cssText = 'display:none;align-items:center;gap:2px;padding:3px;border-radius:9999px;border:1px solid rgba(var(--line-rgb),.15);background:rgba(var(--surface-alt-rgb),.6)';
  pill.setAttribute('role', 'group');
  pill.setAttribute('aria-label', 'Market mood');

  const buttons = THEMES.map(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.theme = t;
    b.setAttribute('aria-label', LABEL[t] + ' mode');
    b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border:0;border-radius:9999px;background:transparent;color:var(--muted);font-family:"JetBrains Mono",monospace;font-size:10px;text-transform:uppercase;letter-spacing:.11em;cursor:pointer;transition:background-color .3s ease,color .3s ease';
    b.innerHTML = ICON[t] + '<span>' + LABEL[t] + '</span>';
    pill.appendChild(b);
    return b;
  });

  const mount = () => {
    const nav = document.querySelector('[data-navlinks]');
    if (pill.parentNode) return true;
    if (!nav || !nav.parentNode) return false;
    nav.parentNode.insertBefore(pill, nav.nextSibling);
    return true;
  };
  if (!mount()) [200, 800, 2000].forEach(ms => setTimeout(mount, ms));

  let unlocked = store.get(UNLOCK) === '1';

  function apply(theme, remember) {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BAR[theme] || BAR.xav);
    buttons.forEach(b => {
      const on = b.dataset.theme === theme;
      b.style.background = on ? 'rgba(var(--line-rgb),.16)' : 'transparent';
      b.style.color = on ? ON_COLOR[b.dataset.theme] : 'var(--muted)';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (remember) store.set(KEY, theme);
  }

  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.theme, true)));

  function toast(html) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translate(-50%,14px);z-index:80;padding:13px 20px;border-radius:8px;border:1px solid rgba(var(--glow-rgb),.35);background:rgba(var(--surface-rgb),.94);backdrop-filter:blur(10px);color:var(--ink-soft);font-size:13.5px;box-shadow:0 18px 50px rgba(0,0,0,.4);opacity:0;transition:opacity .4s ease,transform .4s cubic-bezier(.16,1,.3,1)';
    t.innerHTML = html;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translate(-50%,0)'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translate(-50%,14px)';
      setTimeout(() => t.remove(), 500);
    }, 4200);
  }

  const reveal = () => { pill.style.display = 'flex'; };

  function unlock(theme, announce) {
    const first = !unlocked;
    unlocked = true;
    store.set(UNLOCK, '1');
    mount();
    reveal();
    if (theme) apply(theme, true);
    if (first && announce) toast('<b style="color:var(--ink)">' + LABEL[theme] + ' mode unlocked</b> — switch it in the nav');
  }

  function relock() {
    store.set(UNLOCK, '0'); store.set(KEY, 'xav');
    unlocked = false;
    pill.style.display = 'none';
    apply('xav', false);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  let saved = store.get(KEY);
  if (location.hash === '#relock') { relock(); saved = 'xav'; }
  if (unlocked) reveal();
  apply(THEMES.indexOf(saved) > -1 ? saved : 'xav', false);

  window.addEventListener('hashchange', () => { if (location.hash === '#relock') relock(); });
  document.addEventListener('xav:marketclosed', e => {
    const up = e.detail && e.detail.ret >= 0;
    unlock(up ? 'bull' : 'bear', true);
  });

  window.__xavTheme = { apply, unlock, relock };
  return window.__xavTheme;
}
window.XavageTheme = { initTheme };
