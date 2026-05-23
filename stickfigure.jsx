// Player figure. Renders a Three.js VRM (window.VrmEngine) when available,
// with the original SVG kept underneath as an automatic fallback
// (e.g. when assets can't be fetched over file://).

// anim keyword (used across the screens) -> motion pool folder.
const ANIM_TO_POOL = {
  dance:  'TOP',
  idle:   'INPUTNAME',
  chal:   'CHALL',
  cheer:  'CORRECT',
  sad:    'INCORRECT',
  winner: 'WINNER',
};

function SvgStick({ color, deep, anim, size }) {
  const animClass = `stick-anim-${anim}`;
  return (
    <svg
      className={`stick-figure ${animClass}`}
      width={size}
      height={size * 1.5}
      viewBox="0 0 120 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="172" rx="38" ry="6" fill="rgba(43,30,43,0.18)" />
      <g className="torso-bob">
        <g className="limb-leg-l" stroke={deep} strokeWidth="10" strokeLinecap="round">
          <line x1="54" y1="130" x2="46" y2="165" />
        </g>
        <g className="limb-leg-r" stroke={deep} strokeWidth="10" strokeLinecap="round">
          <line x1="66" y1="130" x2="74" y2="165" />
        </g>
        <rect x="40" y="65" width="40" height="70" rx="14"
          fill={`url(#grad-${color})`} stroke="#2b1e2b" strokeWidth="4" />
        <g className="limb-arm-l" stroke={deep} strokeWidth="10" strokeLinecap="round">
          <line x1="50" y1="65" x2="34" y2="100" />
        </g>
        <g className="limb-arm-r" stroke={deep} strokeWidth="10" strokeLinecap="round">
          <line x1="70" y1="65" x2="86" y2="100" />
        </g>
        <g className="head-grp">
          <circle cx="60" cy="32" r="22" fill={color} stroke="#2b1e2b" strokeWidth="4" />
          <circle cx="53" cy="30" r="3" fill="#2b1e2b" />
          <circle cx="67" cy="30" r="3" fill="#2b1e2b" />
          {anim === 'sad'
            ? <path d="M 51 42 Q 60 36 69 42" fill="none" stroke="#2b1e2b" strokeWidth="3" strokeLinecap="round" />
            : <path d="M 51 38 Q 60 46 69 38" fill="none" stroke="#2b1e2b" strokeWidth="3" strokeLinecap="round" />}
          <circle cx="48" cy="38" r="3" fill="#ff8aa0" opacity="0.6" />
          <circle cx="72" cy="38" r="3" fill="#ff8aa0" opacity="0.6" />
          {anim === 'winner' && (
            <polygon points="60,2 64,12 74,12 66,18 70,28 60,22 50,28 54,18 46,12 56,12"
              fill="#ffcf3a" stroke="#2b1e2b" strokeWidth="2" />
          )}
        </g>
      </g>
    </svg>
  );
}

function StickFigure({ color = '#ff4757', deep = '#c81d2c', anim = 'idle', size = 180, index = 0 }) {
  const hostRef = React.useRef(null);
  const figRef = React.useRef(null);
  // 'loading' | 'vrm' | 'failed' — SVG is shown ONLY on failure, never during
  // loading, so there's no SVG flash before the VRM fades in.
  const [status, setStatus] = React.useState('loading');
  // Responsive size: figures fill the available stage height. `size` is kept as
  // a relative weight (challenger bigger, etc.); 140 == the baseline figure.
  const [dims, setDims] = React.useState({ w: Math.round(size * 0.6), h: Math.round(size * 1.1) });
  const { w, h } = dims;
  const latest = React.useRef(dims);
  latest.current = dims;
  const measureRef = React.useRef(null);

  // Measure the nearest stage and scale the figure to fill it (ResizeObserver).
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Height: the figures' actual container. In game this is .player-stage,
    // which shrinks when the level row / scoring card appears below it — so the
    // figures shrink too and their tags stay clear of the guide bubble.
    const box = host.closest('.player-stage') || host.closest('.phase-arena');
    // Width: the row/stage is often centred (content-sized), so take the width
    // from a container that always spans the full available width instead.
    const widthRef = host.closest('.game-main') || host.closest('.screen') || box;
    const AR = 0.55; // figure width / height
    const num = (v) => parseFloat(v) || 0;
    const measure = () => {
      const baseH = (box && box.clientHeight) || window.innerHeight || 720;
      let baseW = window.innerWidth || 1280;
      if (widthRef) {
        const wcs = getComputedStyle(widthRef);
        baseW = widthRef.clientWidth - num(wcs.paddingLeft) - num(wcs.paddingRight);
      }
      // the card wrapping this figure, and the row that lays the cards out
      const card = host.closest('.player-card, .order-card') || host.parentElement;
      const row = (card && card.parentElement) || box;
      const n = Math.max(1, (row && row.childElementCount) || 1);
      // measure real chrome so figures fit regardless of per-screen styling
      const rcs = row ? getComputedStyle(row) : null;
      const rowGap = rcs ? (num(rcs.columnGap) || num(rcs.gap)) : 20;
      const rowPadX = rcs ? num(rcs.paddingLeft) + num(rcs.paddingRight) : 0;
      const ccs = card ? getComputedStyle(card) : null;
      const cardChromeX = ccs ? num(ccs.paddingLeft) + num(ccs.paddingRight) + num(ccs.borderLeftWidth) + num(ccs.borderRightWidth) : 0;

      // width budget: N cards (incl. their chrome + gaps) must fit one row
      const avail = baseW - rowPadX - rowGap * (n - 1);
      const figW = avail / n - cardChromeX - 6;
      const hByWidth = figW / AR;

      // height budget: fill the stage, leaving room for anything below the figure
      const hasBelow = !!(card && card.querySelector('.player-nameplate, .player-pedestal, .order-name'));
      const extra = baseH * (hasBelow ? 0.30 : 0.08);
      // sibling content inside the box that shares the height (e.g. result podium)
      const sib = box && box.querySelector('.result-podium');
      const sibH = sib ? sib.getBoundingClientRect().height + 24 : 0;
      // in-game cards carry role/name tags above the figure + sit under the guide
      // bubble, so reserve headroom there to avoid collisions.
      const topReserve = host.closest('.game-main') ? baseH * 0.42 : 0;
      const hByHeight = Math.min(baseH * 0.85 * (size / 140), baseH - extra - sibH - topReserve);

      const hh = Math.max(110, Math.round(Math.min(hByHeight, hByWidth)));
      const ww = Math.round(hh * AR);
      setDims((d) => (d.w === ww && d.h === hh ? d : { w: ww, h: hh }));
    };
    measureRef.current = measure;
    measure();
    let ro;
    if (box && window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(box); }
    window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [size]);

  // Re-measure after every render too: phase changes (e.g. the level row
  // appearing) resize the container without firing the ResizeObserver reliably.
  React.useEffect(() => { if (measureRef.current) measureRef.current(); });

  // Create the VRM figure once (waits for the engine module + preload).
  React.useEffect(() => {
    let cancelled = false;
    const start = () => {
      const host = hostRef.current;
      if (cancelled || !host) return;
      if (!window.VrmEngine) { setTimeout(start, 60); return; } // module not ready yet
      window.VrmEngine.ready
        .then(() => {
          if (cancelled || !hostRef.current) return;
          const d = latest.current; // use the measured size at creation time
          figRef.current = window.VrmEngine.createFigure(hostRef.current, {
            color, deep, width: d.w, height: d.h, index,
            onReady: () => { if (!cancelled) setStatus('vrm'); },
            onFail:  () => { if (!cancelled) setStatus('failed'); },
          });
          figRef.current.setMotion(ANIM_TO_POOL[anim] || 'INPUTNAME');
        })
        .catch(() => {});
    };
    start();
    return () => {
      cancelled = true;
      if (figRef.current) { figRef.current.dispose(); figRef.current = null; }
    };
    // eslint-disable-next-line
  }, []);

  // Swap motion when the anim prop changes.
  React.useEffect(() => {
    if (figRef.current) figRef.current.setMotion(ANIM_TO_POOL[anim] || 'INPUTNAME');
  }, [anim]);

  // Keep renderer in sync with size changes (responsive / challenger scaling).
  React.useEffect(() => {
    if (figRef.current) figRef.current.resize(w, h);
  }, [w, h]);

  return (
    <div
      ref={hostRef}
      className={`stick-figure stick-anim-${anim}`}
      style={{ position: 'relative', width: w, height: h }}
    >
      {status === 'failed' && <SvgStick color={color} deep={deep} anim={anim} size={size} />}
    </div>
  );
}

window.StickFigure = StickFigure;
