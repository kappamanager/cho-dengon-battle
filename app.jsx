// 超・伝言バトル! — main app: state machine connecting all screens.

const { useState: useSt, useEffect: useEf, useRef: useRf, useMemo: useMm, useCallback: useCb } = React;

function uid() { return Math.random().toString(36).slice(2, 9); }

function App() {
  // step: 'loading' | 'top' | 'count' | 'names' | 'order' | 'timer' | 'game' | 'result'
  const [step, setStep] = useSt('loading');
  const [count, setCount] = useSt(4);
  const [players, setPlayers] = useSt([]); // {id, name, color, deep, order}
  const [totalSec, setTotalSec] = useSt(20 * 60);
  const [remaining, setRemaining] = useSt(null);
  const [scores, setScores] = useSt({}); // id -> number

  // Game-loop state
  const [turnIdx, setTurnIdx] = useSt(0); // index into players (in order)
  const [phase, setPhase] = useSt('reader_select'); // reader_select | level_select | answer_select | scoring
  const [readerId, setReaderId] = useSt(null);
  const [level, setLevel] = useSt(null);
  const [correctIds, setCorrectIds] = useSt([]);
  const [scoringDelta, setScoringDelta] = useSt({});
  const [roundHistory, setRoundHistory] = useSt([]); // for back/undo
  const [showFinishConfirm, setFinishConfirm] = useSt(false);

  // Timer tick
  useEf(() => {
    if (step !== 'game') return;
    if (remaining == null) return;
    const t = setInterval(() => {
      setRemaining((r) => (r == null ? r : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [step, remaining != null]);

  /* ---------- transitions ---------- */
  const goCount = () => setStep('count');
  const handleCount = (n) => { setCount(n); setStep('names'); };
  const handleNames = (names) => {
    const ps = Array.from({ length: count }, (_, i) => ({
      id: uid(),
      name: names[i],
      color: PLAYER_COLORS[i].color,
      deep:  PLAYER_COLORS[i].deep,
      order: i,
    }));
    setPlayers(ps);
    setScores(Object.fromEntries(ps.map(p => [p.id, 0])));
    setStep('order');
  };
  const handleOrder = (ordered) => {
    setPlayers(ordered.map((p, i) => ({ ...p, order: i })));
    setStep('timer');
  };
  const handleTimerStart = (sec) => {
    setTotalSec(sec);
    setRemaining(sec);
    setTurnIdx(0);
    setPhase('reader_select');
    setReaderId(null);
    setLevel(null);
    setCorrectIds([]);
    setRoundHistory([]);
    setStep('game');
  };

  /* ---------- game phase actions ---------- */
  const pickReader = (id) => setReaderId(id);
  const confirmReader = () => setPhase('level_select');
  const pickLevel = (n) => setLevel(n);
  const confirmLevel = () => { setPhase('answer_select'); setCorrectIds([]); };
  const toggleAnswer = (id) => {
    setCorrectIds((cur) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };
  const confirmAnswers = () => {
    // compute scoring deltas
    const challenger = players[turnIdx];
    const lvl = level || 1;
    const correctCount = correctIds.length;
    const delta = {};
    delta[challenger.id] = correctCount * lvl;
    if (readerId) delta[readerId] = correctCount;
    correctIds.forEach((id) => { delta[id] = lvl; });

    // apply scores
    setScores((s) => {
      const next = { ...s };
      Object.entries(delta).forEach(([id, d]) => { next[id] = (next[id] || 0) + d; });
      return next;
    });
    setScoringDelta(delta);
    setPhase('scoring');

    // push history for undo (after scoring frame committed)
    setRoundHistory((h) => [...h, {
      turnIdx, readerId, level: lvl, correctIds: [...correctIds], delta,
    }]);
  };
  const afterScoring = () => {
    // advance to next challenger
    setTurnIdx((i) => (i + 1) % players.length);
    setReaderId(null);
    setLevel(null);
    setCorrectIds([]);
    setScoringDelta({});
    setPhase('reader_select');
  };

  /* ---------- back/undo within game ---------- */
  const canBack = step === 'game' && (
    phase !== 'reader_select' ||
    roundHistory.length > 0
  );
  const handleBack = () => {
    if (step !== 'game') return;
    if (phase === 'level_select') { setPhase('reader_select'); return; }
    if (phase === 'answer_select') { setPhase('level_select'); return; }
    if (phase === 'scoring') {
      // revert last applied delta and re-enter answer_select
      const last = roundHistory[roundHistory.length - 1];
      if (last) {
        setScores((s) => {
          const next = { ...s };
          Object.entries(last.delta).forEach(([id, d]) => { next[id] = (next[id] || 0) - d; });
          return next;
        });
        setRoundHistory((h) => h.slice(0, -1));
        setScoringDelta({});
        setPhase('answer_select');
      }
      return;
    }
    // phase === 'reader_select': rewind to previous round's scoring view (undo last round)
    if (roundHistory.length > 0) {
      const last = roundHistory[roundHistory.length - 1];
      setScores((s) => {
        const next = { ...s };
        Object.entries(last.delta).forEach(([id, d]) => { next[id] = (next[id] || 0) - d; });
        return next;
      });
      setRoundHistory((h) => h.slice(0, -1));
      setTurnIdx(last.turnIdx);
      setReaderId(last.readerId);
      setLevel(last.level);
      setCorrectIds(last.correctIds);
      setScoringDelta({});
      setPhase('answer_select');
    }
  };

  const handleFinish = () => setFinishConfirm(true);
  const confirmFinish = () => { setFinishConfirm(false); setStep('result'); };
  const cancelFinish  = () => setFinishConfirm(false);

  const restart = () => {
    setStep('top');
    setPlayers([]); setScores({}); setRoundHistory([]);
    setReaderId(null); setLevel(null); setCorrectIds([]); setScoringDelta({});
    setTurnIdx(0); setRemaining(null);
  };

  /* ---------- back transitions (pre-game) ---------- */
  const backPreGame = () => {
    if (step === 'count') setStep('top');
    else if (step === 'names') setStep('count');
    else if (step === 'order') setStep('names');
    else if (step === 'timer') setStep('order');
  };

  /* ---------- render ---------- */
  const showConfettiBg = step === 'top' || step === 'result';

  return (
    <>
      <SceneBackground confetti={false} />
      <div className="app-shell">
        {step === 'loading' && <ScreenLoading onDone={() => setStep('top')} />}
        {step === 'top'    && <ScreenTop onStart={goCount} />}
        {step === 'count'  && <ScreenCount initial={count} onConfirm={handleCount} onBack={backPreGame} />}
        {step === 'names'  && <ScreenNames count={count} names={players.map(p => p.name)} onConfirm={handleNames} onBack={backPreGame} />}
        {step === 'order'  && <ScreenOrder players={players} onConfirm={handleOrder} onBack={backPreGame} />}
        {step === 'timer'  && <ScreenTimer onStart={handleTimerStart} onBack={backPreGame} />}

        {step === 'game' && (
          <div className="screen" data-screen-label="06 ゲームプレイ" style={{ padding: '16px 24px 20px' }}>
            <TopBar
              remaining={remaining}
              totalSec={totalSec}
              onBack={handleBack}
              canBack={canBack}
              onFinish={handleFinish}
              label={`第 ${roundHistory.length + (phase === 'scoring' ? 0 : 1)} ラウンド ／ 挑戦者: ${players[turnIdx]?.name || ''}`}
            />
            <div className="game-layout">
              <ScreenGame
                players={players}
                scores={scores}
                challengerIdx={turnIdx}
                phase={phase}
                readerId={readerId}
                level={level}
                correctIds={correctIds}
                scoringDelta={scoringDelta}
                onPickReader={pickReader}
                onPickLevel={pickLevel}
                onToggleAnswer={toggleAnswer}
                onConfirmReader={confirmReader}
                onConfirmLevel={confirmLevel}
                onConfirmAnswers={confirmAnswers}
                onAfterScoring={afterScoring}
              />
              <div className="game-side">
                <Scoreboard players={players} scores={scores} />
              </div>
            </div>
          </div>
        )}

        {step === 'result' && <ScreenResult players={players} scores={scores} onRestart={restart} />}
      </div>

      {showFinishConfirm && (
        <ConfirmDialog
          title="ゲームを終了する？"
          message="このまま結果発表に進みます。よろしいですか？"
          confirmLabel="結果発表へ"
          cancelLabel="まだ続ける"
          onConfirm={confirmFinish}
          onCancel={cancelFinish}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
