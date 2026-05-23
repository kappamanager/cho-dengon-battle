// Shared UI primitives: scene background, top bar, scoreboard, dialogs.

const { useState, useEffect, useRef, useMemo } = React;

const PLAYER_COLORS = [
  { name: '赤',  color: '#ff4757', deep: '#c81d2c' },
  { name: '青',  color: '#2e86ff', deep: '#1659c4' },
  { name: '緑',  color: '#25c66b', deep: '#138c45' },
  { name: '黄',  color: '#ffc63a', deep: '#c98c0a' },
  { name: '紫',  color: '#a563ff', deep: '#6f31c8' },
];
window.PLAYER_COLORS = PLAYER_COLORS;

function SceneBackground({ confetti = false }) {
  const dots = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      left: (i * 6.7 + (i % 3) * 3) % 100,
      top: 5 + ((i * 13) % 80),
      color: ['#ff4757', '#2e86ff', '#25c66b', '#ffc63a', '#a563ff'][i % 5],
      delay: (i * 0.3).toFixed(2),
      rot: (i * 23) % 360,
    }));
  }, []);
  return (
    <div className="scene">
      <div className="bunting">
        <svg viewBox="0 0 1200 70" preserveAspectRatio="none">
          <path d="M 0 0 Q 600 80 1200 0 L 1200 0 0 0 Z" fill="none" stroke="#2b1e2b" strokeWidth="2" />
          {Array.from({ length: 30 }, (_, i) => {
            const x = i * 40 + 8;
            const colors = ['#ff4757', '#ffc63a', '#25c66b', '#2e86ff', '#a563ff'];
            const c = colors[i % 5];
            const dip = Math.sin((i / 30) * Math.PI) * 28;
            return (
              <polygon
                key={i}
                points={`${x},${10 + dip} ${x + 28},${10 + dip} ${x + 14},${42 + dip}`}
                fill={c}
                stroke="#2b1e2b"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {dots.map((d, i) => (
        <span
          key={i}
          className="confetti-dot"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            background: d.color,
            transform: `rotate(${d.rot}deg)`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      <div className="scene-stage" />

      {confetti && <ConfettiRain />}
    </div>
  );
}
window.SceneBackground = SceneBackground;

function ConfettiRain({ count = 80 }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 3,
      color: ['#ff4757', '#2e86ff', '#25c66b', '#ffc63a', '#a563ff', '#ff8ec7'][i % 6],
      rot: Math.random() * 360,
    }));
  }, [count]);
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </>
  );
}
window.ConfettiRain = ConfettiRain;

function formatTime(sec) {
  if (sec == null) return '--:--';
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
window.formatTime = formatTime;

function TopBar({ remaining, totalSec, onBack, canBack, onFinish, label }) {
  let cls = 'topbar';
  let warn = '';
  if (remaining != null && totalSec != null) {
    if (remaining <= 0) { cls += ' over'; warn = 'タイムアップ！'; }
    else if (remaining <= 5 * 60) { cls += ' alert'; warn = '残り5分!!'; }
    else if (remaining <= 10 * 60) { cls += ' warn'; warn = '残り10分'; }
  }
  return (
    <div className={cls}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn-pop ghost small" onClick={onBack} disabled={!canBack}>← 戻る</button>
        <button className="btn-pop small" style={{ background: '#ff4757' }} onClick={onFinish}>終了する</button>
      </div>
      <div style={{ fontFamily: "'Mochiy Pop One', sans-serif", fontSize: 22 }}>
        {label}
      </div>
      <div className="timer-display">
        <span className="timer-ico">⏱</span>
        <span>{formatTime(remaining)}</span>
        {warn && <span style={{ fontSize: 18, marginLeft: 8 }}>{warn}</span>}
      </div>
    </div>
  );
}
window.TopBar = TopBar;

function Scoreboard({ players, scores, pendingDelta }) {
  const max = Math.max(20, ...Object.values(scores), ...Object.values(pendingDelta || {}).map((d, i) => (scores[Object.keys(pendingDelta)[i]] || 0) + d));
  return (
    <div className="scoreboard">
      <h3>★ スコア ★</h3>
      {players.map((p) => {
        const s = scores[p.id] || 0;
        const total = s;
        const pct = Math.min(100, (total / max) * 100);
        return (
          <div className="score-row" key={p.id}>
            <div className="score-name" title={p.name} style={{ color: p.deep }}>{p.name || '???'}</div>
            <div className="score-bar-wrap">
              <div className="score-bar-fill" style={{ width: `${pct}%`, background: p.color }} />
            </div>
            <div className="score-value" style={{ color: p.deep }}>{total}</div>
          </div>
        );
      })}

      <div className="score-rules">
        <div className="score-rules-head">📋 採点ルール</div>
        <div className="score-rule-row">
          <span className="rr-role chal">挑戦者</span>
          <span className="rr-pts">正解者数 × レベル</span>
        </div>
        <div className="score-rule-row">
          <span className="rr-role reader">読み上げ人</span>
          <span className="rr-pts">正解者数</span>
        </div>
        <div className="score-rule-row">
          <span className="rr-role correct">正解者</span>
          <span className="rr-pts">レベル</span>
        </div>
        <div className="score-rules-note">レベルは 1〜5 ／ 不正解は 0 点</div>
      </div>
    </div>
  );
}
window.Scoreboard = Scoreboard;

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'はい', cancelLabel = 'いいえ' }) {
  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-pop ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn-pop" style={{ background: '#ff4757' }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
window.ConfirmDialog = ConfirmDialog;

// Countdown overlay for game start (3,2,1,START)
function Countdown({ onDone }) {
  const [step, setStep] = useState(3);
  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => {
        if (s <= 1) { clearInterval(t); setTimeout(onDone, 800); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="countdown-overlay">
      <div className={`countdown-num${step > 0 ? '' : ' go'}`} key={step}>{step > 0 ? step : 'スタート！'}</div>
    </div>
  );
}
window.Countdown = Countdown;
