// VRM/Three.js engine for 超・伝言バトル!
// Loads the local VRM model + Mixamo FBX motions and renders one tinted VRM
// instance per StickFigure card. Exposes window.VrmEngine for the React layer.
// Pipeline mirrors the technical reference in requirements_dengon_battle.md.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/* ---------- asset paths (corrected to the real local files) ---------- */
const VRM_PATH = '001_3d/002_model/soleil-san_number3_008_for_Cluster3.vrm';
const MOTION_BASE = '001_3d/001_motion';

// Hard-coded files are the deploy-time fallback. On localhost the Python server
// returns a directory listing so changes in the folder are auto-detected; on
// GitHub Pages directory listings aren't available, so this list is what loads.
const MOTION_POOLS = {
  TOP:       { dir: '01_TOP',       loop: true,  files: ['Salsa Dancing.fbx', 'ノリのいい揺れ.fbx', 'ルンバ.fbx', '拳をあげて歩き回る.fbx'] },
  INPUTNAME: { dir: '02_INPUTNAME', loop: true,  files: ['Boxing.fbx', 'Talking.fbx', 'Yelling.fbx', 'クールな野郎だ.fbx', '周りを見渡す.fbx', '外国人リアクション風.fbx', '苛立ち.fbx'] },
  NOTCHALL:  { dir: '03_NOTCHALL',  loop: true,  files: ['Bellydancing.fbx', 'Happy Idle.fbx', 'Happy.fbx', '何かを見渡す素振り.fbx'] },
  CHALL:     { dir: '04_CHALL',     loop: true,  files: ['Silly Dancing.fbx', '拳をぐるぐる.fbx', '敬礼.fbx', '軽く手を振る.fbx'] },
  SELECTED:  { dir: '05_SELECTED',  loop: false, files: ['Pointing.fbx'] },
  CORRECT:   { dir: '06_CORRECT',   loop: false, files: ['Joyful Jump.fbx', '手を振る.fbx'] },
  INCORRECT: { dir: '07_INCORRECT', loop: false, files: ['Rejected.fbx'] },
  WINNER:    { dir: '08_WINNER',    loop: true,  files: ['Shake Fist.fbx', 'Ymca Dance.fbx'] },
  LOSER:     { dir: '09_LOSER',     loop: true,  files: ['Defeat.fbx', 'Standing Arguing.fbx', 'Sword Fight One.fbx'] },
};
const ONCE_POOLS = new Set(['SELECTED', 'CORRECT', 'INCORRECT']);

const motionKey = (pool, file) => `${pool}/${file}`;
const motionUrl = (pool, file) => encodeURI(`${MOTION_BASE}/${MOTION_POOLS[pool].dir}/${file}`);

/* ---------- Mixamo → VRM bone map ---------- */
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

// Some Mixamo exports prefix bones as "mixamorig10Hips" (namespace number)
// instead of "mixamorigHips". Normalise so the rig map still matches.
const normalizeRig = (name) => name.replace(/^mixamorig\d*/, 'mixamorig');
const findHips = (asset) => {
  let hips = null;
  asset.traverse((o) => { if (!hips && /^mixamorig\d*Hips$/.test(o.name)) hips = o; });
  return hips;
};

function remapMixamoClip(asset, vrm, opts = {}) {
  const stripHipsXZ = opts.stripHipsXZ !== false;
  const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();
  const _vec3 = new THREE.Vector3();

  const motionHipsHeight = findHips(asset).position.y;
  const vrmHipsY = vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(_vec3).y;
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
  const isVrm0 = vrm.meta?.metaVersion === '0';

  clip.tracks.forEach((track) => {
    const trackSplitted = track.name.split('.');
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = MIXAMO_VRM_RIG_MAP[normalizeRig(mixamoRigName)];
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

/* ---------- shared preload (model bytes + every FBX asset, once) ---------- */
const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
const fbxLoader = new FBXLoader();

let vrmBuffer = null;
const fbxAssets = {}; // motionKey -> fbx asset
const progress = { loaded: 0, total: 0, done: false }; // for the loading screen

// Auto-discover *.fbx in a motion folder by reading the server's directory
// listing (the python http.server used by 起動.bat returns one). Returns null
// if listing isn't available, so we fall back to the hard-coded `files` list.
async function listFbxFiles(dir) {
  try {
    const res = await fetch(encodeURI(`${MOTION_BASE}/${dir}/`));
    if (!res.ok) return null;
    const html = await res.text();
    const found = [];
    const re = /href="([^"]+\.fbx)"/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      let name = decodeURIComponent(m[1]).split('/').pop();
      if (name && !found.includes(name)) found.push(name);
    }
    return found.length ? found : null;
  } catch (e) {
    return null;
  }
}

async function preload() {
  const res = await fetch(encodeURI(VRM_PATH));
  if (!res.ok) throw new Error(`VRM fetch failed: ${res.status}`);
  vrmBuffer = await res.arrayBuffer();

  // Refresh each pool's file list from the actual folder contents (drop a new
  // .fbx into the folder and it shows up automatically). Falls back to the
  // hard-coded list if the directory can't be listed.
  await Promise.all(Object.values(MOTION_POOLS).map(async (def) => {
    const found = await listFbxFiles(def.dir);
    if (found) def.files = found;
  }));

  progress.total = Object.values(MOTION_POOLS).reduce((s, d) => s + d.files.length, 0);
  const jobs = [];
  for (const [pool, def] of Object.entries(MOTION_POOLS)) {
    for (const file of def.files) {
      jobs.push(
        fbxLoader.loadAsync(motionUrl(pool, file))
          .then((asset) => { fbxAssets[motionKey(pool, file)] = asset; })
          .catch((e) => { console.warn('motion load failed:', pool, file, e); })
          .finally(() => { progress.loaded++; })
      );
    }
  }
  await Promise.all(jobs);
  progress.done = true;
}

const readyPromise = preload();

/* ---------- per-figure VRM instance ---------- */
function buildVrmInstance(color) {
  return new Promise((resolve, reject) => {
    gltfLoader.parse(vrmBuffer.slice(0), '', (gltf) => {
      const vrm = gltf.userData.vrm;
      if (!vrm) { reject(new Error('no VRM in glTF')); return; }

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);
      VRMUtils.rotateVRM0(vrm);

      vrm.scene.traverse((obj) => { obj.frustumCulled = false; });
      if (color) tintVrm(vrm, color, 0.6);

      const mixer = new THREE.AnimationMixer(vrm.scene);
      const actions = {};
      for (const [pool, def] of Object.entries(MOTION_POOLS)) {
        for (const file of def.files) {
          const asset = fbxAssets[motionKey(pool, file)];
          if (!asset) continue;
          const clip = remapMixamoClip(asset, vrm);
          const action = mixer.clipAction(clip);
          if (ONCE_POOLS.has(pool)) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          actions[motionKey(pool, file)] = action;
        }
      }
      resolve({ vrm, mixer, actions });
    }, reject);
  });
}

function fadeAction(handle, name, duration = 0.25) {
  const next = handle.actions[name];
  if (!next) return;
  const current = handle.active;
  if (next === current) { next.enabled = true; next.setEffectiveWeight(1); return; }
  next.stopFading();
  next.reset();
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.play();
  if (current && current !== next) next.crossFadeFrom(current, duration, false);
  handle.active = next;
}

function shuffleIdx(n) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-pool assignment by player slot. The players shown together form a
// "batch"; assigning slot i -> shuffledOrder[i] guarantees no overlap within a
// batch while the pool is large enough (slots beyond the pool size wrap around,
// the minimal unavoidable overlap). A repeated slot index means a new screen,
// so the pool is reshuffled for fresh variety. This is the assignMotions() rule.
const dealers = {};
function assignByIndex(pool, index) {
  const files = MOTION_POOLS[pool]?.files || [];
  if (!files.length) return null;
  let d = dealers[pool];
  if (!d || d.served.has(index)) {
    const order = shuffleIdx(files.length);
    // make a new batch differ from the previous one when possible
    if (d && files.length > 1 && order[0] === d.order[0]) { [order[0], order[1]] = [order[1], order[0]]; }
    d = dealers[pool] = { order, served: new Set() };
  }
  d.served.add(index);
  return files[d.order[index % files.length]];
}

/* ---------- render loop over all live figures ---------- */
const figures = new Set();
const clock = new THREE.Clock();
let rafId = null;

function tick() {
  rafId = requestAnimationFrame(tick);
  const dt = clock.getDelta();
  for (const f of figures) {
    if (!f.handle) continue;
    f.handle.mixer.update(dt);
    f.handle.vrm.update(dt);
    f.renderer.render(f.scene, f.camera);
  }
}
function ensureLoop() { if (rafId == null) tick(); }

// Frame the camera so the model's bounding box fits the (portrait) canvas,
// regardless of the model's real-world scale. A little headroom on top.
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
function frameCamera(fig) {
  if (!fig.handle) return;
  _box.setFromObject(fig.handle.vrm.scene);
  if (_box.isEmpty()) return;
  _box.getSize(_size);
  _box.getCenter(_center);
  const cam = fig.camera;
  const vFov = THREE.MathUtils.degToRad(cam.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
  const fitV = (_size.y / 2) / Math.tan(vFov / 2);
  const fitH = (_size.x / 2) / Math.tan(hFov / 2);
  const dist = Math.max(fitV, fitH) * 1.08 + _size.z / 2;
  const targetY = _center.y + _size.y * 0.02; // small headroom bias
  cam.position.set(_center.x, targetY, _center.z + dist);
  cam.lookAt(_center.x, targetY, _center.z);
  cam.near = Math.max(0.01, dist - _size.z - 1);
  cam.far = dist + _size.z + 10;
  cam.updateProjectionMatrix();
}

/* ---------- public: create one figure inside a container element ---------- */
function createFigure(container, opts = {}) {
  const { color = '#ffffff', width = 160, height = 240, index = 0, onReady, onFail } = opts;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height, false);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .3s;';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 50);
  camera.position.set(0, 0.95, 3.05);
  camera.lookAt(0, 0.92, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xddd0e0, 2.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.6);
  dir.position.set(1.2, 2.0, 1.5);
  scene.add(dir);

  const fig = {
    renderer, scene, camera, canvas, index,
    handle: null, disposed: false,
    baseLoop: null,         // last loop motion name (returned to after one-shots)
    onFinished: null,
  };

  buildVrmInstance(color).then((handle) => {
    if (fig.disposed) { return; }
    fig.handle = handle;
    scene.add(handle.vrm.scene);
    frameCamera(fig);

    handle.mixer.addEventListener('finished', () => {
      if (fig.baseLoop) fadeAction(handle, fig.baseLoop, 0.3);
    });

    figures.add(fig);
    ensureLoop();
    canvas.style.opacity = '1';

    if (fig.pendingPool) { applyMotion(fig, fig.pendingPool); fig.pendingPool = null; }
    if (onReady) onReady();
  }).catch((e) => {
    console.warn('VRM figure build failed (SVG fallback stays visible):', e);
    fig.failed = true;
    if (onFail) onFail();
  });

  return {
    setMotion(pool) {
      if (fig.disposed) return;
      if (!fig.handle) { fig.pendingPool = pool; return; }
      applyMotion(fig, pool);
    },
    resize(w, h) {
      if (fig.disposed) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frameCamera(fig);
    },
    dispose() {
      fig.disposed = true;
      figures.delete(fig);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
    get failed() { return !!fig.failed; },
  };
}

function applyMotion(fig, pool) {
  if (!MOTION_POOLS[pool]) return;
  if (!fig.assigned) fig.assigned = {};
  // cache the assignment per pool so re-renders don't reshuffle this figure
  let file = fig.assigned[pool];
  if (!file) { file = assignByIndex(pool, fig.index || 0); fig.assigned[pool] = file; }
  if (!file) return;
  const name = motionKey(pool, file);
  if (!ONCE_POOLS.has(pool)) fig.baseLoop = name;
  fadeAction(fig.handle, name, 0.28);
}

window.VrmEngine = {
  ready: readyPromise,
  createFigure,
  MOTION_POOLS,
  getProgress: () => ({ ...progress }),
};
