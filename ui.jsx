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

/* ====================================================================
 * 問題データ（標準問題）
 * テーマ(縦) × レベル1〜5(横)。scripts[0] がレベル1、scripts[4] がレベル5。
 * Excel をアップロードするとこれが上書きされる（ui 経由で App state に保持）。
 * ==================================================================== */
const STANDARD_PROBLEMS = [
  {
    theme: '一般',
    scripts: [
      '朝起きてカーテンを開けると、外には気持ちのいい青空が広がっていました。',
      '近所に新しくできたカフェに行ってみたら、店員さんがとても親切で、おすすめのコーヒーを丁寧に説明してくれました。',
      '週末に家族で少し遠くの公園までドライブに行き、お弁当を持ってピクニックをしました。子どもたちは芝生を走り回り、私たちはベンチでのんびりお茶を飲んで過ごしました。',
      '大阪市は来年4月から、市内の公共交通機関を利用する70歳以上の高齢者を対象に、運賃の割引制度を拡大すると発表しました。1乗車あたりの自己負担は現在の半額になる見込みです。',
      '総務省が発表した最新の人口推計によると、日本の総人口は1億2300万人となり、14年連続で減少しました。15歳未満の割合は11.3%まで低下して過去最低を更新する一方、65歳以上は全体の29.2%を占め、社会保障制度の在り方が改めて議論されています。',
    ],
  },
  {
    theme: 'イベント',
    scripts: [
      '本日はお越しいただきありがとうございます。受付はあちらの入り口で行っております。',
      'まもなく開演です。携帯電話はマナーモードに設定をお願いします。なお、会場内での写真撮影はご遠慮ください。',
      'ただいまより、地域の夏祭りの盆踊り大会を始めます。やぐらの周りに輪になってお集まりください。初めての方も、太鼓のリズムに合わせて見よう見まねで大丈夫ですので、ぜひご一緒に踊りましょう。',
      '本日の結婚披露宴は、午後1時の新郎新婦ご入場で開宴いたします。お料理は全7品のコースをご用意し、乾杯のご発声は新郎の上司、田中様にお願いしております。余興は5組の方にご参加いただく予定です。',
      '市民音楽祭の第2部では、市内3つの中学校の吹奏楽部による合同演奏をお届けします。総勢120名の編成で、課題曲を含む全4曲、演奏時間はおよそ45分の予定です。終演後はホール正面ロビーで出演者との記念撮影の時間を設けますので、ご希望の方はスタッフの誘導に従ってお並びください。',
    ],
  },
  {
    theme: '友達',
    scripts: [
      'ごめん、電車が遅れてて、あと10分くらいで着くから、先に飲み物頼んでていいよ。',
      'この前話してた映画、やっと見に行けたんだけど、すごく良かったよ。続編もあるらしいから、今度一緒に見に行かない？',
      'さっき店員さんが言ってたんだけど、この店、平日の夜は飲み放題が90分から120分に延長されるんだって。あと、誕生日の人がいたらデザートをサービスしてくれるらしいよ。',
      '来月の三連休にみんなで温泉旅行に行こうって話になってて、今のところ4人参加で、1泊2食付きで1人1万5千円くらいの宿を探してるんだ。車を出せる人がいれば、現地集合じゃなくて一緒に行けるんだけど、どうかな。',
      '来週の飲み会の幹事なんだけど、今のところ8人参加で、そのうち2人がアレルギーがあるからコースじゃなくて単品で頼みたいんだって。あと1人は遅れて9時くらいに合流するらしいから、先に席だけ確保しておいてって店に伝えてもらえる？会費は1人4千円で集める予定。',
    ],
  },
];
window.STANDARD_PROBLEMS = STANDARD_PROBLEMS;

// Excel フォーマット（標準問題入り）をダウンロード
function downloadProblemFormat() {
  if (typeof XLSX === 'undefined') { alert('Excel機能の読み込みに失敗しました。ネット接続をご確認ください。'); return; }
  const header = ['テーマ', 'レベル1', 'レベル2', 'レベル3', 'レベル4', 'レベル5'];
  const rows = STANDARD_PROBLEMS.map((t) => [t.theme, ...t.scripts]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 12 }, { wch: 44 }, { wch: 44 }, { wch: 44 }, { wch: 44 }, { wch: 44 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '問題');
  XLSX.writeFile(wb, '超伝言バトル_問題フォーマット.xlsx');
}
window.downloadProblemFormat = downloadProblemFormat;

// アップロードされた Excel を解析して問題セット配列を返す
// 形式: 1行目=ヘッダ、2行目以降=テーマ行（A列=テーマ名、B〜F列=レベル1〜5）
async function parseProblemFile(file) {
  if (typeof XLSX === 'undefined') throw new Error('Excel機能が利用できません');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  const out = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const theme = String(row[0] ?? '').trim();
    if (!theme) continue;
    const scripts = [];
    for (let lv = 1; lv <= 5; lv++) scripts.push(String(row[lv] ?? '').trim());
    if (scripts.every((s) => s === '')) continue; // テーマ名だけで原稿が空の行は無視
    out.push({ theme, scripts });
  }
  return out;
}
window.parseProblemFile = parseProblemFile;

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
      <div className="topbar-label">{label}</div>
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
