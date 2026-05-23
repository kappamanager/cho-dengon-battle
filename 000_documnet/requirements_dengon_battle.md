# 超・伝言バトル! — 要件定義書

## 概要
手話伝言ゲームの**進行ガイド＋スコア管理サイト**。  
原稿の表示や問題の選択はサイト上では扱わない。あくまで「今誰の番で、何フェーズで、誰が何点か」を可視化し、ゲーム進行をナビゲートするUIを提供する。

- **デバイス**: PC（デスクトップブラウザ）
- **言語**: 日本語
- **技術スタック**: HTML + CSS + JavaScript（Single Page Application、単一ファイル）
- **3Dモデル**: VRMモデル + Mixamo FBXモーション（Three.js + @pixiv/three-vrm）
- **参考実装**: 添付の `index.html`（VRM Parkour Battle）に同一パイプラインの実装あり。後述の技術リファレンスに核心コードパターンを抽出済み。

---

## デザイン方針

### トーン・配色
- **マリオパーティー風**: 明るく、ポップで、パーティー感のある配色
- ダークなトーン不要。背景・UI共に暖色〜ビビッド系を基調とする
- テロップやガイドは太字・大きめフォントで「バラエティ番組のテロップ感」を出す
- ボタンは大きく、押しやすく、押した時のフィードバック（アニメーション）をつける

### 背景
- TOP画面・ゲーム中画面には背景を入れる（寂しくならないように）
- パーティー会場・ステージ・お祭り的な明るい背景イメージ
- CSSグラデーション、パターン、または装飾的SVG要素で実現

### 棒人間モデル（5体分）
- VRMモデルを読み込み、`tintVrm()` で色替え（プレイヤーごとに異なる色）
- 色は被らなければ何色でもよい（例: 赤・青・緑・黄・紫）
- Mixamo FBXモーションを `remapMixamoClip()` でVRMボーンにマッピングして再生
- **モーションは場面ごとにフォルダ分けされたプール構造**（01_TOP〜09_LOSER）
- プレイヤーごとに被りなしでランダム割り当て（`assignMotions()`）
- 詳細は技術リファレンスの「場面×モーション マッピング表」および「モーション ランダム割り当てロジック」を参照
- モーション切り替えは `fadeAction()` でクロスフェード
- VRMファイルとFBXファイルはローカルから読み込む構成（パスは定数で定義、後から差し替え可能に）

---

## 画面フロー

### 画面1: TOPページ
- タイトル「超・伝言バトル!」をドーンと大きく表示
- 棒人間が踊っている演出（`01_TOP` プールからランダム割り当て）
- 「遊ぶ！」ボタンを画面中央にデカく配置
- パーティー感のある背景

### 画面2: プレイヤー人数入力
- 「何人で遊ぶ？」のガイドテキスト
- 人数入力（2〜5名）＋「決定」ボタン
- 人数を入力すると、対応する数の棒人間がポンと登場する演出

### 画面3: プレイヤー名前入力
- 画面2で決定した人数分の棒人間が色分けされて並ぶ
- 各棒人間の下に名前入力フィールド
- 棒人間は `02_INPUTNAME` プールからランダム割り当てのモーションをループ再生
- 全員の名前を入力したら「決定」ボタンが活性化

### 画面4: 順番決め
- プレイヤーをドラッグ＆ドロップまたはタップで並び替え
- 並び順＝ゲーム中の挑戦順
- 「決定」ボタンで次へ

### 画面5: タイマー設定
- 制限時間を入力（分単位）
- 大きめの数字入力UI（派手めに）
- 「ゲームスタート！」ボタンで次へ
- 押下時にカウントダウン演出（3, 2, 1, スタート！）があると盛り上がる

### 画面6: ゲームプレイ（メインループ）

以下のフェーズを繰り返す:

#### フェーズ①: 読み上げ人選択
- 現在の挑戦者の棒人間を前面に大きく表示 + `04_CHALL` モーション再生
- 挑戦者以外は `03_NOTCHALL` プールからランダム割り当てのモーションをループ再生
- ガイド吹き出し:「読み上げ人を選んでください」
- 他のプレイヤーの棒人間をクリック可能にする
- クリックで読み上げ人を選択 → 選択された棒人間をハイライト + `05_SELECTED` モーション再生

#### フェーズ②: レベル選択
- ガイド吹き出し:「レベルを選んで伝言を開始してください」
- レベル選択UI: 1〜5の数値を選択（ボタン or セレクター）
- 「採点へ」ボタンで次へ
- ※ジャンルはサイト上では扱わない。レベルのみ（スコア計算に必要なため）

#### フェーズ③: 正解者選択
- ガイド吹き出し:「正解者を選択してください」
- 挑戦者・読み上げ人以外のプレイヤーをクリック可能
- 複数選択可能。選択された棒人間をハイライト + `06_CORRECT` モーション再生
- 選択されなかった回答者は `07_INCORRECT` モーション再生（採点完了時）
- 「採点完了」ボタンで次へ

#### フェーズ④: 採点処理
- スコア加算アニメーション（数字がカウントアップ）
- 棒グラフがにゅっと伸びる演出
- 加算内訳の表示:
  - 挑戦者: +（正解者数 × レベル）ポイント
  - 読み上げ人: +（正解者数）ポイント
  - 各正解者: +（レベル）ポイント
- 自動的に次の挑戦者に回り、フェーズ①に戻る

### 画面7: 終了・結果発表
- 終了ボタン押下でこの画面に遷移
- 1位の棒人間がセンターで `08_WINNER` モーション再生（ループ）
- 2位以下は `09_LOSER` プールからランダム割り当てのモーションをループ再生
- 紙吹雪エフェクト
- 「おめでとう！」テキストを大きく表示
- 全プレイヤーの最終スコアランキング表示
- TOPに戻るボタン

---

## 常時表示要素（ゲームプレイ画面中）

### スコアボード（棒グラフ形式）
- 画面の片側（右サイドまたは下部）に常時表示
- プレイヤーごとの棒グラフ（色はプレイヤーカラーに対応）
- スコア数値もグラフ上またはグラフ横に表示
- スコア加算時にアニメーションで伸びる

### 戻るボタン
- 画面上に常時表示（左上などの固定位置）
- 1つ前のフェーズに戻れる
- 採点結果も巻き戻し可能（加算したスコアを差し戻す）

### 終了ボタン
- 画面上に常時表示（戻るボタンの近くに配置）
- 押下で確認ダイアログ → 結果発表画面へ

### タイマー
- 画面上に常時表示（上部中央など目立つ位置）
- カウントダウン形式で残り時間を表示
- 残り10分: 画面に通知演出（点滅・色変化など）
- 残り5分: 画面に通知演出（より強調）
- 残り0分: 画面に通知演出（タイムアップ表示）
- ※タイマーは通知のみ。実際のゲーム終了は終了ボタンのみが扱う

---

## スコア計算ロジック

各ラウンドで以下のポイントが加算される:

| 役割 | 加算ポイント |
|---|---|
| 挑戦者（手話を表現した人） | 正解者数 × レベル |
| 読み上げ人（原稿を読んだ人） | 正解者数 |
| 正解した回答者（1人あたり） | レベル |

- レベルは1〜5の整数
- 不正解の回答者にはポイント加算なし
- 挑戦者と読み上げ人は回答者にならない

---

## ゲーム進行の状態管理

```
状態として保持すべきデータ:
- players[]: { id, name, color, score, order }
- currentRound: { challengerIndex, readerIndex, level, correctAnswerIds[] }
- roundHistory[]: 各ラウンドの採点結果（戻る機能で使用）
- timer: { totalSeconds, remainingSeconds, notifications: {10min, 5min, 0min} }
- phase: 'reader_select' | 'level_select' | 'answer_select' | 'scoring'
- turnIndex: 現在の挑戦者を示すインデックス（players[].orderに基づいて巡回）
```

---

## 補足・注意事項
- 原稿の内容はサイト上に一切表示しない
- サイトはあくまで進行ガイド＋スコア管理が目的
- パーティーゲームとしての楽しさ・盛り上がり感を演出で担保する
- 一時的なレクリエーション用サイトなので、データ永続化は不要（ブラウザリロードでリセットでOK）
- VRM/FBX読み込み・モーション適用・色替え・モーション切り替えは全て参考実装（VRM Parkour Battle）に実績のあるパターンが存在する。下記技術リファレンスに従って実装すること。

---

## 技術リファレンス（参考実装: VRM Parkour Battle の index.html より抽出）

### CDN / importmap

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
    "@pixiv/three-vrm": "https://unpkg.com/@pixiv/three-vrm@3.0.0/lib/three-vrm.module.js"
  }
}
</script>
```

### 必須import

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
```

### Mixamo → VRM ボーンマッピング

```js
const MIXAMO_VRM_RIG_MAP = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
};
```

### FBXモーション → VRMクリップ変換（remapMixamoClip）

```js
function remapMixamoClip(asset, vrm, opts = {}) {
  const stripHipsXZ = opts.stripHipsXZ !== false;
  const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();
  const _vec3 = new THREE.Vector3();

  const motionHipsHeight = asset.getObjectByName('mixamorigHips').position.y;
  const vrmHipsY = vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(_vec3).y;
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
  const isVrm0 = vrm.meta?.metaVersion === '0';

  clip.tracks.forEach((track) => {
    const trackSplitted = track.name.split('.');
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = MIXAMO_VRM_RIG_MAP[mixamoRigName];
    const vrmNodeName = vrm.humanoid.getNormalizedBoneNode(vrmBoneName)?.name;
    const mixamoRigNode = asset.getObjectByName(mixamoRigName);
    if (vrmNodeName == null || mixamoRigNode == null) return;
    const propertyName = trackSplitted[1];
    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
    mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const newValues = new Float32Array(track.values.length);
      for (let i = 0; i < track.values.length; i += 4) {
        _quatA.fromArray(track.values, i);
        _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
        _quatA.toArray(newValues, i);
        if (isVrm0) { newValues[i] = -newValues[i]; newValues[i + 2] = -newValues[i + 2]; }
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, newValues));
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      const value = Array.from(track.values).map((v, i) => {
        const sign = (isVrm0 && i % 3 !== 1) ? -1 : 1;
        return sign * v * hipsPositionScale;
      });
      if (vrmBoneName === 'hips' && stripHipsXZ) {
        for (let i = 0; i < value.length; i += 3) { value[i] = 0; value[i + 2] = 0; }
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
    }
  });

  let actualDuration = 0;
  for (const t of tracks) {
    if (t.times?.length) actualDuration = Math.max(actualDuration, t.times[t.times.length - 1]);
  }
  return new THREE.AnimationClip(clip.name, actualDuration > 0 ? actualDuration : clip.duration, tracks);
}
```

### VRM読み込み（loadVrmInstance）

```js
const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
const fbxLoader = new FBXLoader();

async function loadVrmInstance(source) {
  let gltf;
  if (typeof source === 'string') {
    gltf = await gltfLoader.loadAsync(source);
  } else {
    gltf = await new Promise((resolve, reject) => gltfLoader.parse(source, '', resolve, reject));
  }
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error('VRMデータが見つかりませんでした');

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  const sceneRotOffset = vrm.scene.rotation.y;

  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
    if (obj.isMesh) obj.castShadow = true;
  });

  const mixer = new THREE.AnimationMixer(vrm.scene);
  const actions = {};
  for (const [name, asset] of Object.entries(fbxAssets)) {
    const clip = remapMixamoClip(asset, vrm, { name });
    const action = mixer.clipAction(clip);
    // ループ/ワンショット設定はモーションごとに決める
    actions[name] = action;
  }
  return { vrm, mixer, actions, sceneRotOffset };
}
```

### VRM色替え（tintVrm） — プレイヤーカラー分けに使用

```js
function tintVrm(vrm, hex, blend = 0.55, emissiveHex = 0x000000) {
  const tint = new THREE.Color(hex);
  vrm.scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.color) m.color.lerp(tint, blend);
        if (m.emissive) m.emissive.setHex(emissiveHex);
      });
    }
  });
}
```

### モーション切り替え（fadeAction）

```js
function fadeAction(target, current, name, duration = 0.22) {
  const next = target.actions[name];
  if (!next) return current;
  if (next === current) { next.enabled = true; next.weight = 1; return current; }
  if (current) current.enabled = true;
  next.stopFading();
  next.reset();
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.play();
  if (current && current !== next) next.crossFadeFrom(current, duration, false);
  target.active = next;
  return next;
}
```

### アセットパス定義（実装時に差し替え）

```js
// VRMモデルパス
const VRM_PATH = './assets/model/stick_figure.vrm';

// ベースディレクトリ
const MOTION_BASE = './assets/motion';

// 場面ごとのモーションプール
// 各フォルダ内のFBXファイルがプールとなる。ファイル名は実装時に実ファイルに合わせて差し替え。
const MOTION_POOLS = {
  TOP:        { dir: `${MOTION_BASE}/01_TOP`,        loop: true,  files: [] },  // TOP画面ダンス演出
  INPUTNAME:  { dir: `${MOTION_BASE}/02_INPUTNAME`,  loop: true,  files: [] },  // 名前入力・順番決め・タイマー設定の待機
  NOTCHALL:   { dir: `${MOTION_BASE}/03_NOTCHALL`,   loop: true,  files: [] },  // ゲーム中：挑戦者以外の待機
  CHALL:      { dir: `${MOTION_BASE}/04_CHALL`,       loop: true,  files: [] },  // ゲーム中：挑戦者の注目ポーズ
  SELECTED:   { dir: `${MOTION_BASE}/05_SELECTED`,   loop: false, files: [] },  // 読み上げ人に選ばれた時のリアクション
  CORRECT:    { dir: `${MOTION_BASE}/06_CORRECT`,    loop: false, files: [] },  // 正解者の喜び
  INCORRECT:  { dir: `${MOTION_BASE}/07_INCORRECT`,  loop: false, files: [] },  // 不正解者の残念
  WINNER:     { dir: `${MOTION_BASE}/08_WINNER`,     loop: true,  files: [] },  // 終了画面：1位の勝利ポーズ（1つでOK）
  LOSER:      { dir: `${MOTION_BASE}/09_LOSER`,      loop: true,  files: [] },  // 終了画面：2位以下のリアクション
};
```

### 場面×モーション マッピング表

| フォルダ名 | 場面 | ループ | 対象プレイヤー | 備考 |
|---|---|---|---|---|
| `01_TOP` | TOP画面 | ループ | 全員（装飾用） | ダンス系 |
| `02_INPUTNAME` | 名前入力・順番決め・タイマー設定 | ループ | 全員 | アイドル系バリエーション |
| `03_NOTCHALL` | ゲーム中：挑戦者以外 | ループ | 挑戦者以外 | 待機バリエーション |
| `04_CHALL` | ゲーム中：挑戦者 | ループ | 挑戦者1名 | 手を上げる・アピール系 |
| `05_SELECTED` | 読み上げ人選択時 | ワンショット→待機に戻る | 選ばれた1名 | リアクション |
| `06_CORRECT` | 正解者 | ワンショット→待機に戻る | 正解した回答者 | 喜び・ガッツポーズ |
| `07_INCORRECT` | 不正解者 | ワンショット→待機に戻る | 不正解の回答者 | がっかり・肩落とし |
| `08_WINNER` | 終了画面：1位 | ループ | 1位の1名のみ | 勝利ポーズ（1種でOK） |
| `09_LOSER` | 終了画面：2位以下 | ループ | 1位以外 | 拍手・おとなしめ |

### モーション ランダム割り当てロジック

```js
/**
 * プールからプレイヤー数分のモーションを被りなしでランダム割り当て
 * - poolSize >= playerCount → 被りなしシャッフル
 * - poolSize <  playerCount → シャッフルして循環（被りを最小化）
 *
 * @param {string[]} pool - モーション名の配列（フォルダ内のFBXファイル名群）
 * @param {number} count - 割り当てたいプレイヤー数
 * @returns {string[]} - 各プレイヤーに割り当てられたモーション名の配列
 */
function assignMotions(pool, count) {
  if (pool.length === 0) return new Array(count).fill(null);

  // Fisher-Yatesシャッフル
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // プレイヤー数分割り当て（足りなければ循環）
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}

// 使用例: ゲーム開始時にフェーズごとの割り当てを事前計算
function preAssignAllMotions(players) {
  const n = players.length;
  return {
    top:        assignMotions(MOTION_POOLS.TOP.files, n),
    inputName:  assignMotions(MOTION_POOLS.INPUTNAME.files, n),
    notChall:   assignMotions(MOTION_POOLS.NOTCHALL.files, n),
    chall:      assignMotions(MOTION_POOLS.CHALL.files, 1),       // 挑戦者は1名ずつ
    selected:   assignMotions(MOTION_POOLS.SELECTED.files, 1),    // 選ばれるのは1名
    correct:    assignMotions(MOTION_POOLS.CORRECT.files, n),     // 誰が正解するか不明なので全員分
    incorrect:  assignMotions(MOTION_POOLS.INCORRECT.files, n),
    winner:     MOTION_POOLS.WINNER.files[0] || null,             // 1種固定
    loser:      assignMotions(MOTION_POOLS.LOSER.files, n - 1),
  };
}
```

### ワンショット/ループ設定

```js
// ワンショットモーション: 再生完了後に自動的に待機モーションに戻す
const ONCE_POOLS = new Set(['SELECTED', 'CORRECT', 'INCORRECT']);

// loadVrmInstance内でアクション登録時:
for (const [poolName, pool] of Object.entries(MOTION_POOLS)) {
  for (const file of pool.files) {
    const clip = remapMixamoClip(fbxAssets[file], vrm);
    const action = mixer.clipAction(clip);
    if (ONCE_POOLS.has(poolName)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[file] = action;
  }
}
```

### 実装上の注意

1. **VRMインスタンスはプレイヤー数分生成する**: 同一VRMファイルを複数回 `loadVrmInstance()` して個別の `mixer` / `actions` を持たせる
2. **色替えは読み込み直後に `tintVrm()` で行う**: blend値 0.55〜0.7 程度で元モデルの質感を残しつつ色分け
3. **毎フレーム `mixer.update(dt)` を全プレイヤー分呼ぶ**: アニメーションの更新
4. **VRM 0.x 互換**: `VRMUtils.rotateVRM0(vrm)` と `sceneRotOffset` の保持で対応済み
5. **ポストプロセスは不要**: 参考実装にはBloom/Afterimage等があるが、パーティーゲームUIでは不要。シンプルなWebGLRendererで十分
