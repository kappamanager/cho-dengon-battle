// All 7 screens for 超・伝言バトル!
// Uses global StickFigure, PLAYER_COLORS, TopBar, Scoreboard, ConfirmDialog, Countdown, ConfettiRain.

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;

const BGM_SRC = encodeURI('002_bgm/ひそやかパーティー.mp3');

/* ====================================================================
 * 画面0: ローディング（全モーションをこの間に読み込む / 約10秒で期待感を演出）
 * ==================================================================== */
function ScreenLoading({ onDone }) {
  const [pct, setPct] = useS(0);
  const [tipIdx, setTipIdx] = useS(0);
  const [finished, setFinished] = useS(false);
  const readyRef = useR(false);
  const tips = [
    '棒人間たちが準備運動中…',
    'モーションを読み込み中…',
    'ステージを設営中…',
    'まもなく開演！',
  ];
  const MIN_MS = 10000;

  useE(() => {
    let done = false;
    const start = performance.now();
    const eng = window.VrmEngine;
    let waitInterval = null;
    if (eng && eng.ready) {
      eng.ready.then(() => { readyRef.current = true; }).catch(() => { readyRef.current = true; });
    } else {
      // engine module not present yet — poll for it, then its ready
      waitInterval = setInterval(() => {
        if (window.VrmEngine && window.VrmEngine.ready) {
          clearInterval(waitInterval); waitInterval = null;
          window.VrmEngine.ready.then(() => { readyRef.current = true; }).catch(() => { readyRef.current = true; });
        }
      }, 80);
    }
    // pre-warm the BGM file into the browser cache so playback starts instantly
    // when the user clicks "はじめる" (which provides the gesture audio needs).
    try {
      const pre = new Audio(BGM_SRC);
      pre.preload = 'auto';
      pre.load();
    } catch (e) {}

    // setInterval (not requestAnimationFrame) so the loader keeps progressing
    // even when the tab is backgrounded / preview window is hidden.
    const tick = setInterval(() => {
      if (done) return;
      const el = performance.now() - start;
      const timePct = Math.min(1, el / MIN_MS);
      const p = Math.min(timePct, readyRef.current ? 1 : 0.96);
      setPct(Math.round(p * 100));
      setTipIdx(Math.min(tips.length - 1, Math.floor(el / (MIN_MS / tips.length))));
      if (el >= MIN_MS && readyRef.current) {
        done = true;
        setPct(100);
        setFinished(true);
        clearInterval(tick);
      }
    }, 80);
    return () => { clearInterval(tick); if (waitInterval) clearInterval(waitInterval); };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="screen loading-screen" data-screen-label="00 ローディング">
      <div className="loading-box">
        <div className="subtitle-stripe top-bob">手話伝言ゲーム</div>
        <div className="loading-title top-wiggle">
          超<span style={{ color: '#ff5b6e' }}>・</span>伝言バトル<span className="bang">!</span>
        </div>

        <div className="loading-dots">
          {PLAYER_COLORS.map((c, i) => (
            <span key={i} className="loading-dot" style={{ background: c.color, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>

        {!finished ? (
          <>
            <div className="loading-bar-wrap">
              <div className="loading-bar-fill" style={{ width: `${pct}%` }} />
              <span className="loading-bar-pct">{pct}%</span>
            </div>
            <div className="loading-tip">{tips[tipIdx]}</div>
          </>
        ) : (
          <>
            <div className="loading-tip" style={{ color: 'var(--ink)' }}>準備完了！</div>
            <button className="btn-pop huge gold top-cta" onClick={onDone}>
              ▶ はじめる！
            </button>
          </>
        )}
      </div>
    </div>
  );
}
window.ScreenLoading = ScreenLoading;

/* ====================================================================
 * 画面1: TOP
 * ==================================================================== */
function ScreenTop({ onStart, onUpload, onDownload, problemStatus }) {
  // dancing demo players
  const demo = PLAYER_COLORS.slice(0, 4);
  const fileRef = useR(null);

  // TOP BGM: play once (no loop). Browsers may block autoplay with sound,
  // so fall back to starting on the first user interaction.
  useE(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = false;
    audio.volume = 0.6;
    let unlock = null;
    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();
    unlock = () => { tryPlay(); cleanupUnlock(); };
    const cleanupUnlock = () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      cleanupUnlock();
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);
  return (
    <div className="screen top-screen" data-screen-label="01 TOP">
      <ConfettiRain count={90} />
      <div className="top-title-wrap">
        <div className="subtitle-stripe top-bob">手話伝言ゲーム</div>
        <div className="title-mega top-wiggle">
          超
          <span style={{ color: '#ff5b6e' }}>・</span>
          伝言<br />
          バトル<span className="bang">!</span>
        </div>
      </div>

      <div className="player-stage">
        {demo.map((c, i) => (
          <div key={i} className="player-card pop-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <StickFigure color={c.color} deep={c.deep} anim="dance" size={140} index={i} />
          </div>
        ))}
      </div>

      <div className="col-center" style={{ paddingBottom: 12 }}>
        <button className="btn-pop huge gold top-cta" onClick={onStart}>
          ▶ 遊ぶ！
        </button>

        <div className="problem-bar">
          <button className="btn-pop ghost small" onClick={onDownload}>
            ⬇ 問題フォーマット
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = ''; }}
          />
          <button className="btn-pop ghost small" onClick={() => fileRef.current && fileRef.current.click()}>
            ⬆ 問題をアップロード
          </button>
          <span className="problem-status">{problemStatus}</span>
        </div>
      </div>
    </div>
  );
}
window.ScreenTop = ScreenTop;

/* ====================================================================
 * 画面2: 人数選択
 * ==================================================================== */
function ScreenCount({ initial, onConfirm, onBack }) {
  const [count, setCount] = useS(initial || 4);
  return (
    <div className="screen" data-screen-label="02 人数入力">
      <div className="row-center" style={{ justifyContent: 'space-between' }}>
        <button className="btn-pop ghost small" onClick={onBack}>← TOP</button>
        <div className="guide-bubble">何人で遊ぶ？</div>
        <div style={{ width: 80 }} />
      </div>

      <div className="player-stage">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="player-card pop-in" style={{ animationDelay: `${i * 0.08}s` }}>
            <div
              className="player-color-tag"
              style={{ background: PLAYER_COLORS[i].color }}
            >P{i + 1}</div>
            <StickFigure
              color={PLAYER_COLORS[i].color}
              deep={PLAYER_COLORS[i].deep}
              anim="idle"
              size={130}
              index={i}
            />
          </div>
        ))}
      </div>

      <div className="col-center">
        <div className="count-row">
          {[2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`count-chip ${count === n ? 'active' : ''}`}
              onClick={() => setCount(n)}
            >
              <div className="num">{n}</div>
              <div className="lbl">人</div>
            </button>
          ))}
        </div>

        <button className="btn-pop gold" onClick={() => onConfirm(count)}>
          決定 →
        </button>
      </div>
    </div>
  );
}
window.ScreenCount = ScreenCount;

/* ====================================================================
 * 画面3: 名前入力
 * ==================================================================== */
function ScreenNames({ count, names, onConfirm, onBack }) {
  const [vals, setVals] = useS(() =>
    Array.from({ length: count }, (_, i) => names?.[i] || '')
  );
  const ready = vals.every((v) => v.trim().length > 0);

  return (
    <div className="screen" data-screen-label="03 名前入力">
      <div className="row-center" style={{ justifyContent: 'space-between' }}>
        <button className="btn-pop ghost small" onClick={onBack}>← 戻る</button>
        <div className="guide-bubble">名前を入れてね！</div>
        <div style={{ width: 80 }} />
      </div>

      <div className="player-stage">
        {Array.from({ length: count }, (_, i) => {
          const c = PLAYER_COLORS[i];
          return (
            <div key={i} className="player-card pop-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="player-color-tag" style={{ background: c.color }}>P{i + 1}</div>
              <StickFigure color={c.color} deep={c.deep} anim="idle" size={140} index={i} />
              <div className="player-pedestal" />
              <div className="player-nameplate" style={{ borderColor: c.deep }}>
                <input
                  type="text"
                  size={1}
                  placeholder={`プレイヤー${i + 1}`}
                  value={vals[i]}
                  maxLength={8}
                  onChange={(e) => {
                    const next = [...vals];
                    next[i] = e.target.value;
                    setVals(next);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="col-center">
        <button
          className="btn-pop gold"
          disabled={!ready}
          onClick={() => onConfirm(vals.map((v) => v.trim()))}
        >決定 →</button>
      </div>
    </div>
  );
}
window.ScreenNames = ScreenNames;

/* ====================================================================
 * 画面4: 順番決め (drag + arrow buttons)
 * ==================================================================== */
function ScreenOrder({ players, onConfirm, onBack }) {
  const [order, setOrder] = useS(players);
  const [draggingId, setDragging] = useS(null);
  const [overId, setOverId] = useS(null);

  const move = (idx, dir) => {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };

  const onDragStart = (id) => (e) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    setOverId(id);
  };
  const onDrop = (targetId) => (e) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDragging(null); setOverId(null); return; }
    const fromIdx = order.findIndex((p) => p.id === draggingId);
    const toIdx = order.findIndex((p) => p.id === targetId);
    const next = [...order];
    const [m] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, m);
    setOrder(next);
    setDragging(null); setOverId(null);
  };

  return (
    <div className="screen" data-screen-label="04 順番決め">
      <div className="row-center" style={{ justifyContent: 'space-between' }}>
        <button className="btn-pop ghost small" onClick={onBack}>← 戻る</button>
        <div className="guide-bubble">挑戦する順番に並べてね</div>
        <div style={{ width: 80 }} />
      </div>

      <div className="player-stage" style={{ paddingTop: 32 }}>
        <div className="order-row">
          {order.map((p, idx) => (
            <div
              key={p.id}
              className={[
                'order-card',
                draggingId === p.id ? 'dragging' : '',
                overId === p.id && draggingId !== p.id ? 'drag-over' : ''
              ].join(' ')}
              draggable
              onDragStart={onDragStart(p.id)}
              onDragOver={onDragOver(p.id)}
              onDrop={onDrop(p.id)}
              onDragEnd={() => { setDragging(null); setOverId(null); }}
            >
              <div className="order-num">{idx + 1}</div>
              <StickFigure color={p.color} deep={p.deep} anim="idle" size={110} index={idx} />
              <div className="order-name" style={{ color: p.deep }}>{p.name}</div>
              <div className="order-arrows">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}>←</button>
                <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1}>→</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-center">
        <div className="hint">ドラッグ＆ドロップ または ← → で並べ替え</div>
        <button className="btn-pop gold" onClick={() => onConfirm(order)}>
          決定 →
        </button>
      </div>
    </div>
  );
}
window.ScreenOrder = ScreenOrder;

/* ====================================================================
 * 画面5: タイマー設定
 * ==================================================================== */
function ScreenTimer({ onStart, onBack }) {
  const [mins, setMins] = useS(30);
  const [countdown, setCountdown] = useS(false);

  const presets = [30, 40, 50, 60];

  const begin = () => setCountdown(true);

  return (
    <div className="screen" data-screen-label="05 タイマー設定">
      <div className="row-center" style={{ justifyContent: 'space-between' }}>
        <button className="btn-pop ghost small" onClick={onBack}>← 戻る</button>
        <div className="guide-bubble">制限時間は何分？</div>
        <div style={{ width: 80 }} />
      </div>

      <div className="phase-arena" style={{ justifyContent: 'center' }}>
        <div className="timer-input-stage">
          <div className="timer-big">
            <div className="timer-num-box">
              <input
                type="number"
                min={1}
                max={180}
                value={mins}
                onChange={(e) => setMins(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="timer-unit">分</div>
          </div>

          <div className="timer-presets">
            {presets.map((m) => (
              <button
                key={m}
                className={`chip-num ${mins === m ? 'active' : ''}`}
                onClick={() => setMins(m)}
                style={{ width: 70, height: 70, fontSize: 28 }}
              >{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="col-center">
        <button className="btn-pop huge gold" onClick={begin}>
          ゲームスタート！
        </button>
      </div>

      {countdown && <Countdown onDone={() => onStart(mins * 60)} />}
    </div>
  );
}
window.ScreenTimer = ScreenTimer;

/* ====================================================================
 * 画面6: ゲームプレイ
 * Phase: reader_select → level_select → answer_select → scoring → next
 * ==================================================================== */
function ScreenGame({
  players,
  scores,
  challengerIdx,
  phase,
  readerId,
  level,
  correctIds,
  scoringDelta,
  onPickReader,
  problems,
  themeIdx,
  onPickCell,
  onCancelCell,
  onToggleAnswer,
  onConfirmReader,
  onConfirmLevel,
  onConfirmAnswers,
  onAfterScoring,
}) {
  const challenger = players[challengerIdx];
  const phaseLabels = {
    reader_select: 'フェーズ① 読み上げ人を選ぼう',
    level_select:  'フェーズ② 原稿を選ぼう',
    answer_select: 'フェーズ③ 正解者を選ぼう',
    scoring:       'フェーズ④ 採点中…',
  };
  const guideText = {
    reader_select: '読み上げ人を選んでください',
    level_select:  'テーマとレベルを選んで原稿を開いてください',
    answer_select: '正解者を選択してください',
    scoring:       '採点中…',
  };
  const scriptOpen = phase === 'level_select' && themeIdx != null && level != null;

  // (scoring used to auto-advance after 2.4s, but players need time to read
  //  the breakdown — they now press a "次のラウンドへ" button explicitly.)

  return (
    <div className="game-main">
      <div className="phase-stage">
        <div className="phase-guide">
          <div className="guide-bubble">{guideText[phase]}</div>
        </div>

        <div className="phase-arena">
          {/* Players row */}
          <div className="player-stage">
            {players.map((p, idx) => {
              const isChall = p.id === challenger.id;
              const isReader = readerId === p.id;
              const isCorrect = correctIds.includes(p.id);
              const clickable =
                (phase === 'reader_select' && !isChall) ||
                (phase === 'answer_select' && !isChall && !isReader);
              const dimmed =
                (phase === 'level_select' && !isChall && !isReader) ||
                (phase === 'answer_select' && (isChall || isReader));
              let anim = 'idle';
              if (isChall) anim = 'chal';
              if (isReader && phase !== 'reader_select') anim = 'cheer';
              if (phase === 'scoring') {
                if (isCorrect) anim = 'cheer';
                else if (!isChall && !isReader) anim = 'sad';
              }
              const onClick = () => {
                if (!clickable) return;
                if (phase === 'reader_select') onPickReader(p.id);
                if (phase === 'answer_select') onToggleAnswer(p.id);
              };
              return (
                <div
                  key={p.id}
                  className={[
                    'player-card',
                    isChall ? 'challenger' : '',
                    isReader ? 'highlighted' : '',
                    isCorrect ? 'highlighted' : '',
                    clickable ? 'clickable' : '',
                    dimmed ? 'dimmed' : '',
                  ].join(' ')}
                  onClick={onClick}
                >
                  {isChall && <div className="role-tag">挑戦者</div>}
                  {isReader && !isChall && <div className="role-tag reader">読み上げ人</div>}
                  {phase === 'scoring' && isCorrect && <div className="role-tag correct">正解</div>}
                  <div className="player-color-tag" style={{ background: p.color, top: -4, position: 'relative' }}>{p.name}</div>
                  <StickFigure
                    color={p.color}
                    deep={p.deep}
                    anim={anim}
                    size={isChall ? 160 : 120}
                    index={idx}
                  />
                  {phase === 'scoring' && scoringDelta[p.id] > 0 && (
                    <div className="score-pop" style={{ left: '50%' }}>+{scoringDelta[p.id]}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Phase-specific panel: theme × level script picker */}
          {phase === 'level_select' && (
            <div className="script-picker">
              <div
                className="script-grid"
                style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}
              >
                <div className="sg-corner">テーマ＼レベル</div>
                {[1, 2, 3, 4, 5].map((lv) => (
                  <div key={lv} className="sg-head">
                    <span className="sg-lv">レベル{lv}</span>
                    <span className="sg-stars">{'★'.repeat(lv)}</span>
                  </div>
                ))}
                {(problems || []).map((t, ti) => (
                  <React.Fragment key={ti}>
                    <div className="sg-theme">{t.theme}</div>
                    {[1, 2, 3, 4, 5].map((lv) => {
                      const has = (t.scripts[lv - 1] || '').trim().length > 0;
                      const sel = themeIdx === ti && level === lv;
                      return (
                        <button
                          key={lv}
                          className={`sg-cell ${sel ? 'active' : ''}`}
                          disabled={!has}
                          onClick={() => onPickCell(ti, lv)}
                        >
                          {has ? '原稿' : '—'}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {phase === 'scoring' && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <div className="scoring-card">
                <h2>採点結果</h2>
                <div className="scoring-line">
                  <span>挑戦者 {challenger.name}（正解者数 × レベル）</span>
                  <span className="pts">+{scoringDelta[challenger.id] || 0}</span>
                </div>
                {readerId && (
                  <div className="scoring-line">
                    <span>読み上げ人 {players.find(p => p.id === readerId)?.name}（正解者数）</span>
                    <span className="pts">+{scoringDelta[readerId] || 0}</span>
                  </div>
                )}
                {correctIds.map((id) => {
                  const p = players.find(p => p.id === id);
                  return (
                    <div className="scoring-line" key={id}>
                      <span>正解者 {p.name}（レベル）</span>
                      <span className="pts">+{scoringDelta[id] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="phase-controls">
          {phase === 'reader_select' && (
            <button
              className="btn-pop gold"
              disabled={!readerId}
              onClick={onConfirmReader}
            >原稿選択へ →</button>
          )}
          {phase === 'answer_select' && (
            <button
              className="btn-pop gold"
              onClick={onConfirmAnswers}
            >採点完了 →</button>
          )}
          {phase === 'scoring' && (
            <button
              className="btn-pop gold"
              onClick={onAfterScoring}
            >次のラウンドへ →</button>
          )}
        </div>
      </div>

      {/* Script overlay — the reader reads this aloud, then proceeds to scoring */}
      {scriptOpen && (
        <div className="script-overlay">
          <div className="script-card">
            <div className="script-badge">
              <span className="sb-theme">{problems[themeIdx].theme}</span>
              <span className="sb-level">レベル {level} <span className="sb-stars">{'★'.repeat(level)}</span></span>
            </div>
            <div className="script-text">{problems[themeIdx].scripts[level - 1]}</div>
            <div className="script-actions">
              <button className="btn-pop ghost" onClick={onCancelCell}>← 選び直す</button>
              <button className="btn-pop gold" onClick={onConfirmLevel}>採点へ →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.ScreenGame = ScreenGame;

/* ====================================================================
 * 画面7: 結果発表
 * ==================================================================== */
function ScreenResult({ players, scores, onRestart }) {
  // Sort descending by score, then assign standard competition rank (1224 style):
  // same score → same rank, next distinct score gets index+1 as its rank.
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const ranked = sorted.map((p, i) => ({ p, score: scores[p.id] || 0, rank: 0 }));
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].score === ranked[i - 1].score) {
      ranked[i].rank = ranked[i - 1].rank;
    } else {
      ranked[i].rank = i + 1;
    }
  }
  const winners = ranked.filter((r) => r.rank === 1);
  const isTie = winners.length > 1;

  const rankClass = (rank) =>
    rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'flat';

  return (
    <div className="screen" data-screen-label="07 結果発表">
      <ConfettiRain count={120} />

      <div className="col-center" style={{ marginTop: 8 }}>
        <div className="subtitle-stripe">RESULT</div>
        <div className="result-title">
          {isTie ? '同点優勝！' : 'おめでとう！'}
        </div>
      </div>

      <div className="phase-arena" style={{ justifyContent: 'center', gap: 12 }}>
        {/* Winner row (supports ties — multiple 1st place) */}
        <div className="winner-row" style={{ marginBottom: 8 }}>
          {winners.map(({ p }, wi) => (
            <div key={p.id} className="col-center" style={{ gap: 4 }}>
              <StickFigure
                color={p.color}
                deep={p.deep}
                anim="winner"
                size={winners.length > 2 ? 150 : winners.length > 1 ? 170 : 200}
                index={wi}
              />
              <div
                style={{
                  fontFamily: "'Mochiy Pop One', sans-serif",
                  fontSize: 24,
                  color: p.deep,
                  background: 'white',
                  padding: '4px 16px',
                  border: '4px solid #2b1e2b',
                  borderRadius: 12,
                  boxShadow: '0 4px 0 #2b1e2b',
                  whiteSpace: 'nowrap',
                }}
              >
                🏆 {p.name}
              </div>
            </div>
          ))}
        </div>

        {/* Podium — show all players, ties share rank styling */}
        <div className="result-podium">
          {ranked.map(({ p, score, rank }) => (
            <div key={p.id} className={`podium-base ${rankClass(rank)}`}>
              <div className="place"><sup>第</sup>{rank}<sup>位</sup></div>
              <div className="pname" style={{ color: p.deep }}>{p.name}</div>
              <div className="pscore">{score} pt</div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-center">
        <button className="btn-pop gold huge" onClick={onRestart}>TOPに戻る</button>
      </div>
    </div>
  );
}
window.ScreenResult = ScreenResult;
