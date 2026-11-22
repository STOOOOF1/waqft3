// مدينة الوقف — طبقة العالم بـ three.js (WebGLRenderer). كل النصوص العربية في DOM عبر LEARN.
import * as THREE from "three";

const COL = {
  sand: 0xd9b98a, sandFar: 0xc89f6c, path: 0xead2a6, plaza: 0xe8cfa0, ring: 0xc99a62,
  stone: 0xd8b07a, plaster: 0xf0e2c6, clay: 0xb8693a, dome: 0x2a9d8f, domeDark: 0x1f7a73,
  gold: 0xe3a73b, wood: 0x7a4a2a, recess: 0x4a2f24, water: 0x3fa7b5, robe: 0x1f7a73, skin: 0xe0b48a, white: 0xf7f1e6,
  palm: 0x5f7d3a, palmDark: 0x48612b, trunk: 0x8a5f3a,
};
const R_RING = 40;

// ---------- أدوات بناء ودمج الهندسة (لتقليل استدعاءات الرسم) ----------
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
class Builder {
  constructor() { this.parts = new Map(); }
  add(geo, m, color) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }
  box(w, h, d, x, y, z, c, ry = 0) { this.add(new THREE.BoxGeometry(w, h, d), M(x, y + h / 2, z, 0, ry), c); }
  cyl(rt, rb, h, x, y, z, c, seg = 16) { this.add(new THREE.CylinderGeometry(rt, rb, h, seg), M(x, y + h / 2, z), c); }
  dome(r, x, y, z, c, seg = 20) { this.add(new THREE.SphereGeometry(r, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), M(x, y, z), c); }
  ball(r, x, y, z, c) { this.add(new THREE.SphereGeometry(r, 12, 8), M(x, y, z), c); }
  cone(r, h, x, y, z, c, seg = 12) { this.add(new THREE.ConeGeometry(r, h, seg), M(x, y + h / 2, z), c); }
  // فجوة قوس على الواجهة الأمامية (+z)
  arch(w, h, x, y, z, c = COL.recess, depth = 0.3) {
    this.box(w, h - w / 2, depth, x, y, z, c);
    this.add(new THREE.CylinderGeometry(w / 2, w / 2, depth, 16), M(x, y + h - w / 2, z, Math.PI / 2), c);
  }
  build(mats, { cast = true, receive = true } = {}) {
    const group = new THREE.Group();
    for (const [color, list] of this.parts) {
      let n = 0; list.forEach(g => n += g.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats(color)); mesh.castShadow = cast; mesh.receiveShadow = receive;
      group.add(mesh);
    }
    return group;
  }
}

// ---------- المعالم السبعة (الواجهة نحو +z، المركز المحلي عند z≈-1) ----------
function landmarkGeometry(i) {
  const b = new Builder();
  b.box(15, 0.5, 13, 0, 0, -1, COL.stone);                          // منصة
  switch (i) {
    case 0: { // الجامع
      b.box(12, 5, 9, 0, 0.5, -1.5, COL.plaster);
      b.box(12.4, 0.5, 9.4, 0, 5.5, -1.5, COL.clay);
      b.cyl(3.4, 3.4, 0.9, 0, 6, -1.5, COL.plaster, 20);
      b.dome(3.4, 0, 6.9, -1.5, COL.dome, 24);
      b.cyl(0.12, 0.12, 1.2, 0, 10.2, -1.5, COL.gold, 6); b.ball(0.32, 0, 11.5, -1.5, COL.gold);
      [-4.4, 4.4].forEach(x => { b.cyl(1.1, 1.1, 0.5, x, 5.5, -4.5, COL.plaster); b.dome(1.1, x, 6, -4.5, COL.domeDark, 14); });
      b.cyl(0.85, 1, 13, 5.6, 0.5, 3, COL.plaster, 10);                // المئذنة
      b.cyl(1.35, 1.35, 0.4, 5.6, 10, 3, COL.clay, 10);
      b.cyl(0.7, 0.7, 2, 5.6, 13.5, 3, COL.plaster, 10); b.cone(0.8, 1.8, 5.6, 15.5, 3, COL.dome, 10); b.ball(0.2, 5.6, 17.4, 3, COL.gold);
      b.arch(2.4, 3.6, 0, 0.5, 3.05); [-3.6, 3.6].forEach(x => b.arch(1.3, 2.4, x, 1.2, 3.05));
      break;
    }
    case 1: { // ديوان النظارة
      b.box(15, 5.5, 7, 0, 0.5, -2, COL.stone);
      b.box(15.4, 0.7, 7.4, 0, 6, -2, COL.clay);
      for (let k = -2; k <= 2; k++) b.arch(1.9, 3.8, k * 2.8, 0.5, 1.55);
      [-7.5, 7.5].forEach(x => { b.box(2.8, 9, 2.8, x, 0.5, -2, COL.plaster); b.dome(1.4, x, 9.5, -2, COL.dome, 14); b.arch(0.8, 1.6, x, 5.5, -0.55); });
      for (let k = -6; k <= 6; k += 1.5) b.box(0.6, 0.6, 0.6, k, 6.7, 1.3, COL.stone);
      break;
    }
    case 2: { // الخان الوقفي
      const T = 1, S = 14, H = 4.2;
      b.box(S, H, T, 0, 0.5, -1 - S / 2 + T / 2, COL.stone);
      b.box(T, H, S, -S / 2 + T / 2, 0.5, -1, COL.stone); b.box(T, H, S, S / 2 - T / 2, 0.5, -1, COL.stone);
      b.box(5, H, T, -4.5, 0.5, -1 + S / 2 - T / 2, COL.stone); b.box(5, H, T, 4.5, 0.5, -1 + S / 2 - T / 2, COL.stone);
      b.box(4.4, 7.5, 1.6, 0, 0.5, 5.4, COL.plaster); b.arch(2.6, 5, 0, 0.5, 6.25); b.box(4.8, 0.5, 1.9, 0, 8, 5.4, COL.clay);
      const aw = [COL.clay, COL.dome, COL.gold];
      for (let k = 0; k < 4; k++) {
        [-4.6, 4.6].forEach((x, s) => { const z = -6 + k * 2.6; b.box(1.6, 1.1, 1.6, x, 0.5, z, COL.wood); b.box(2.1, 0.15, 2.1, x, 2.4, z, aw[(k + s) % 3]); b.box(0.12, 1.3, 0.12, x + (s ? -0.9 : 0.9), 1.1, z + 0.9, COL.wood); });
      }
      b.cyl(1.2, 1.4, 0.8, 0, 0.5, -1.5, COL.stone);
      break;
    }
    case 3: { // دار البرّ
      b.box(11, 6, 8.5, 0, 0.5, -1.8, COL.plaster);
      b.box(11.4, 0.5, 8.9, 0, 6.5, -1.8, COL.clay); b.box(11.2, 0.4, 0.4, 0, 3.4, 2.5, COL.clay);
      [-3, 3].forEach(x => { b.cyl(1.6, 1.6, 0.6, x, 7, -2, COL.plaster); b.dome(1.6, x, 7.6, -2, COL.dome, 16); });
      b.arch(2.2, 3.4, 0, 0.5, 2.5);
      [-3.8, 3.8].forEach(x => { b.arch(1.1, 1.8, x, 1.3, 2.5); b.arch(1.1, 1.8, x, 4.1, 2.5); });
      b.cyl(1.1, 1.2, 1, -5.2, 0.5, 4.5, COL.stone, 14); b.box(0.15, 2.2, 0.15, -6.1, 1.5, 4.5, COL.wood); b.box(0.15, 2.2, 0.15, -4.3, 1.5, 4.5, COL.wood); b.box(2.1, 0.15, 0.15, -5.2, 3.6, 4.5, COL.wood);
      [[3.8, 3.6], [4.6, 4.1], [4.2, 4.9]].forEach(([x, z]) => b.ball(0.55, x, 1.0, z, COL.wood));
      break;
    }
    case 4: { // السبيل
      b.cyl(3.4, 3.6, 4.6, 0, 0.5, -1, COL.plaster, 8);
      b.cyl(3.8, 3.8, 0.5, 0, 5.1, -1, COL.clay, 8);
      b.cyl(3.0, 3.0, 0.8, 0, 5.6, -1, COL.plaster, 16); b.dome(3.0, 0, 6.4, -1, COL.dome, 22);
      b.cyl(0.1, 0.1, 1, 0, 9.3, -1, COL.gold, 6); b.ball(0.28, 0, 10.4, -1, COL.gold);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; const gx = Math.sin(a) * 3.45, gz = -1 + Math.cos(a) * 3.45; b.add(new THREE.BoxGeometry(1.2, 2, 0.2), M(gx, 2.4, gz, 0, a), COL.recess); }
      b.cyl(3.6, 3.8, 0.8, 0, 0.5, 5.2, COL.stone, 20);
      break;
    }
    case 5: { // المدرسة
      b.box(13, 6.5, 8, 0, 0.5, -3, COL.stone);
      b.box(13, 9.5, 2, 0, 0.5, 2, COL.plaster);
      b.arch(5, 7.5, 0, 0.5, 3.05);
      b.box(13.4, 0.5, 2.4, 0, 10, 2, COL.gold);
      [-5.2, 5.2].forEach(x => { b.arch(1.4, 2.6, x, 1.2, 3.05); b.arch(1.4, 2.6, x, 5.2, 3.05); });
      [-6.8, 6.8].forEach(x => { b.cyl(0.6, 0.7, 11, x, 0.5, 2, COL.plaster, 10); b.cyl(0.95, 0.95, 0.35, x, 8.8, 2, COL.clay, 10); b.cone(0.65, 1.6, x, 11.5, 2, COL.dome, 10); });
      b.dome(2.8, 0, 7, -3.5, COL.dome, 20);
      break;
    }
    case 6: { // خزانة الكتب
      b.box(8, 6, 8, 0, 0.5, -1.5, COL.stone);
      b.box(8.4, 0.5, 8.4, 0, 6.5, -1.5, COL.clay);
      b.cyl(3, 3.2, 5, 0, 7, -1.5, COL.plaster, 12);
      b.cyl(3.4, 3.4, 0.4, 0, 12, -1.5, COL.clay, 12);
      b.cyl(2.2, 2.4, 3, 0, 12.4, -1.5, COL.plaster, 12);
      b.dome(2.3, 0, 15.4, -1.5, COL.dome, 16);
      b.arch(2.2, 3.4, 0, 0.5, 2.55);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.add(new THREE.BoxGeometry(0.7, 1.4, 0.2), M(Math.sin(a) * 3.05, 8.6, -1.5 + Math.cos(a) * 3.05, 0, a), COL.recess); }
      const bc = [COL.clay, COL.dome, COL.gold, COL.wood];
      for (let k = 0; k < 5; k++) b.box(1.4, 0.35, 1, 3.6, 0.5 + k * 0.36, 3.6, bc[k % 4], k * 0.25);
      break;
    }
  }
  return b;
}

export async function start(L) {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL غير متاح");

  const C = L.C, host = document.getElementById("world");
  const touch = L.touch;
  let low = L.prefLow();
  if (low == null) low = touch || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.25 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const HORIZON = new THREE.Color(0xf0a060);
  scene.fog = new THREE.Fog(HORIZON, 55, 190);
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 600);

  // ---------- السماء والضوء ----------
  const sunDir = new THREE.Vector3(-0.75, 0.22, -0.62).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3a2b52) }, mid: { value: new THREE.Color(0xc4607a) }, hor: { value: new THREE.Color(0xf6b064) }, sun: { value: sunDir } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform vec3 top,mid,hor,sun; varying vec3 vP;
      void main(){ float h = clamp(vP.y,0.0,1.0);
        vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.18,0.75,h));
        float s = max(dot(normalize(vP), sun),0.0);
        c += vec3(1.0,0.75,0.4)*pow(s,40.0)*0.9 + vec3(1.0,0.55,0.25)*pow(s,6.0)*0.35;
        if (vP.y < 0.0) c = hor*0.92;
        gl_FragColor = vec4(c,1.0); }`,
  }));
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }));
  sunDisc.position.copy(sunDir).multiplyScalar(400); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);

  scene.add(new THREE.HemisphereLight(0xffd7a8, 0x6b4a3a, 1.45));
  const sun = new THREE.DirectionalLight(0xffb576, 2.7);
  sun.position.copy(sunDir).multiplyScalar(90); sun.castShadow = !low;
  const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 220;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const matCache = new Map();
  const mats = color => {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: color === COL.gold ? 0.35 : 0, flatShading: true }));
    return matCache.get(color);
  };

  // ---------- الأرض والممرات والساحة ----------
  const groundGeo = new THREE.PlaneGeometry(420, 420, 84, 84); groundGeo.rotateX(-Math.PI / 2);
  { const p = groundGeo.attributes.position, cols = new Float32Array(p.count * 3), c1 = new THREE.Color(COL.sand), c2 = new THREE.Color(COL.sandFar), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      const n = Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.sin((x + z) * 0.05);
      if (r > 78) p.setY(i, Math.max(0, (r - 78) * 0.06 * (1.6 + n)));
      t.copy(c1).lerp(c2, Math.min(1, Math.max(0, (r - 50) / 70) * 0.8 + n * 0.08 + 0.1));
      cols.set([t.r, t.g, t.b], i * 3);
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3)); groundGeo.computeVertexNormals(); }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; scene.add(ground);

  const units = C.chapters, N = units.length;
  const ang = i => i / N * Math.PI * 2;
  const lmPos = i => new THREE.Vector3(Math.sin(ang(i)) * R_RING, 0, -Math.cos(ang(i)) * R_RING);

  const flat = new Builder();
  flat.add(new THREE.CircleGeometry(13, 48).rotateX(-Math.PI / 2), M(0, 0.03, 0), COL.plaza);
  flat.add(new THREE.RingGeometry(9.2, 10, 48).rotateX(-Math.PI / 2), M(0, 0.05, 0), COL.ring);
  flat.add(new THREE.RingGeometry(12.4, 13, 48).rotateX(-Math.PI / 2), M(0, 0.05, 0), COL.ring);
  for (let i = 0; i < N; i++) {
    const a = ang(i), len = R_RING - 13 - 6;
    flat.add(new THREE.PlaneGeometry(4.2, len).rotateX(-Math.PI / 2), M(Math.sin(a) * (13 + len / 2), 0.025, -Math.cos(a) * (13 + len / 2), 0, -a), COL.path);
    flat.add(new THREE.CircleGeometry(11, 32).rotateX(-Math.PI / 2), M(Math.sin(a) * (R_RING - 5), 0.02, -Math.cos(a) * (R_RING - 5)), COL.path);
  }
  const flatGroup = flat.build(mats, { cast: false, receive: true }); scene.add(flatGroup);

  // نافورة الساحة ولوحة المنهج والمرشد
  const plaza = new Builder();
  plaza.cyl(3.2, 3.4, 0.8, 0, 0, 0, COL.stone, 24); plaza.cyl(0.5, 0.7, 2.4, 0, 0.6, 0, COL.plaster, 10); plaza.cyl(1.3, 1.1, 0.35, 0, 2.6, 0, COL.stone, 16);
  plaza.box(3.6, 2.4, 0.3, -5, 0.9, 6, COL.wood, 0.5); plaza.box(0.25, 1, 0.25, -6.3, 0, 5.3, COL.wood); plaza.box(0.25, 1, 0.25, -3.7, 0, 6.7, COL.wood);
  const plazaGroup = plaza.build(mats); scene.add(plazaGroup);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.95, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: COL.water, emissive: 0x1a5d66, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.1 }));
  water.position.set(0, 0.72, 0); scene.add(water);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ color: 0x2fa596 }));
  board.position.set(-5 + Math.sin(0.5) * 0.17, 2.1, 6 + Math.cos(0.5) * 0.17); board.rotation.y = 0.5; scene.add(board);
  const guide = new THREE.Group();
  { const g = new Builder(); g.cyl(0.42, 0.55, 1.4, 0, 0, 0, 0x7a3b2a, 12); g.ball(0.33, 0, 1.68, 0, COL.skin); g.ball(0.36, 0, 1.86, 0, COL.white); g.cyl(0.05, 0.05, 2.1, 0.55, 0, 0.1, COL.wood, 6);
    guide.add(g.build(mats)); guide.position.set(5, 0, 6); guide.rotation.y = -0.6; scene.add(guide); }

  // ---------- المعالم والبوابات ----------
  const landmarks = [], gates = [];
  const gateMatOff = new THREE.MeshStandardMaterial({ color: COL.stone, roughness: 0.9, flatShading: true });
  const gateMatOn = new THREE.MeshStandardMaterial({ color: COL.gold, emissive: 0xffb84a, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.3 });
  const gateShape = (() => { const g = new Builder(); g.box(0.6, 3.2, 0.6, -2, 0, 0, 1); g.box(0.6, 3.2, 0.6, 2, 0, 0, 1); g.add(new THREE.TorusGeometry(2, 0.32, 8, 20, Math.PI), M(0, 3.2, 0), 1); return g.build(() => gateMatOff).children[0].geometry; })();
  for (let i = 0; i < N; i++) {
    const grp = landmarkGeometry(i).build(mats);
    const p = lmPos(i); grp.position.copy(p); grp.rotation.y = -ang(i); scene.add(grp);
    const gate = new THREE.Mesh(gateShape, gateMatOff); gate.castShadow = true;
    gate.position.set(0, 0.5, 7.2); grp.add(gate); gates.push(gate);
    landmarks.push({ grp, pos: p, center: grp.localToWorld(new THREE.Vector3(0, 0, -1)), unit: units[i] });
  }
  scene.updateMatrixWorld(true);
  landmarks.forEach(l => l.center = l.grp.localToWorld(new THREE.Vector3(0, 0, -1)));

  // ---------- فوانيس الدروس (مُثَنّاة) ----------
  const posts = [];
  units.forEach((u, i) => {
    const n = u.lessons.length;
    u.lessons.forEach((l, k) => {
      const x = (k - (n - 1) / 2) * 3.3, z = 11.5 - Math.abs(x) * 0.18;
      const w = landmarks[i].grp.localToWorld(new THREE.Vector3(x, 0, z));
      posts.push({ lesson: l, unit: u, pos: w, i });
    });
  });
  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.28, 2.2, 8); pillarGeo.translate(0, 1.1, 0);
  const capGeo = new THREE.BoxGeometry(0.7, 0.18, 0.7); capGeo.translate(0, 2.25, 0);
  const pillars = new THREE.InstancedMesh(pillarGeo, mats(COL.stone), posts.length); pillars.castShadow = true;
  const caps = new THREE.InstancedMesh(capGeo, mats(COL.clay), posts.length);
  const lampGeo = new THREE.SphereGeometry(0.34, 14, 10);
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), posts.length);
  const halos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.85, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }), posts.length);
  posts.forEach((p, k) => {
    const m = M(p.pos.x, 0, p.pos.z); pillars.setMatrixAt(k, m); caps.setMatrixAt(k, m);
    lamps.setMatrixAt(k, M(p.pos.x, 2.75, p.pos.z));
  });
  [pillars, caps, lamps, halos].forEach(o => scene.add(o));

  // ---------- عمود الهدف ----------
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 30; scene.add(beam);

  // ---------- الزخرفة: بيوت ونخيل وفوانيس الطرق ----------
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const decor = new THREE.Group(); scene.add(decor);
  const houseCount = low ? 70 : 120;
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), houseCount);
  const hdomes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats(COL.domeDark), houseCount);
  const tones = [0xd8b07a, 0xe6caa0, 0xcf9e6a, 0xf0dcb8, 0xc58d5a].map(c => new THREE.Color(c));
  let hd = 0;
  for (let k = 0; k < houseCount; k++) {
    const a = rnd() * Math.PI * 2, r = 60 + rnd() * 26;
    const w = 3 + rnd() * 4, h = 2.5 + rnd() * 4.5, d = 3 + rnd() * 4;
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
    houses.setMatrixAt(k, M(x, 0, z, 0, a + rnd() * 0.4, 0, w, h, d)); houses.setColorAt(k, tones[k % tones.length]);
    if (rnd() < 0.3) { const s = Math.min(w, d) * 0.38; hdomes.setMatrixAt(hd++, M(x, h, z, 0, 0, 0, s, s, s)); }
  }
  hdomes.count = hd; houses.receiveShadow = true; decor.add(houses, hdomes);

  const palmSpots = [];
  for (let k = 0; k < (low ? 40 : 70); k++) {
    const a = rnd() * Math.PI * 2, r = 16 + rnd() * 42, x = Math.sin(a) * r, z = -Math.cos(a) * r;
    let ok = true;
    for (let i = 0; i < N; i++) { const da = Math.abs(((a - ang(i)) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da * r < 4.5) ok = false; if (lmPos(i).distanceTo(_v.set(x, 0, z)) < 17) ok = false; }
    if (ok) palmSpots.push([x, z, 0.8 + rnd() * 0.5, rnd() * 6]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 5, 7); trunkGeo.translate(0, 2.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, mats(COL.trunk), palmSpots.length); trunks.castShadow = !low;
  const leafGeo = new THREE.BoxGeometry(0.5, 0.08, 2.6); leafGeo.translate(0, 0, 1.3);
  const leaves = new THREE.InstancedMesh(leafGeo, mats(COL.palm), palmSpots.length * 6); leaves.castShadow = !low;
  palmSpots.forEach(([x, z, s, r0], k) => {
    trunks.setMatrixAt(k, M(x, 0, z, 0.06, r0, 0.05, s, s, s));
    for (let j = 0; j < 6; j++) leaves.setMatrixAt(k * 6 + j, new THREE.Matrix4().compose(_v.set(x + 0.3 * s, 5 * s, z + 0.25 * s), _q.setFromEuler(_e.set(0.5, r0 + j * Math.PI / 3, 0, "YXZ")), _s.set(s, s, s)));
  });
  decor.add(trunks, leaves);

  const lampSpots = [];
  for (let i = 0; i < N; i++) for (let d = 16; d < R_RING - 12; d += 6) [-1, 1].forEach(sd => {
    const a = ang(i), x = Math.sin(a) * d + Math.cos(a) * 2.8 * sd, z = -Math.cos(a) * d + Math.sin(a) * 2.8 * sd; lampSpots.push([x, z]);
  });
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6); poleGeo.translate(0, 1.3, 0);
  const poles = new THREE.InstancedMesh(poleGeo, mats(COL.wood), lampSpots.length);
  const plights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc966 }), lampSpots.length);
  lampSpots.forEach(([x, z], k) => { poles.setMatrixAt(k, M(x, 0, z)); plights.setMatrixAt(k, M(x, 2.7, z)); });
  decor.add(poles, plights);

  const moteCount = 260, mp = new Float32Array(moteCount * 3);
  for (let k = 0; k < moteCount; k++) { mp[k * 3] = (rnd() - 0.5) * 120; mp[k * 3 + 1] = 0.5 + rnd() * 9; mp[k * 3 + 2] = (rnd() - 0.5) * 120; }
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(mp, 3)),
    new THREE.PointsMaterial({ color: 0xffd28a, size: 0.18, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.visible = !low; scene.add(motes);

  // ---------- اللاعب ----------
  const player = new THREE.Group();
  { const g = new Builder(); g.cyl(0.36, 0.5, 1.25, 0, 0, 0, COL.robe, 12); g.box(0.8, 0.14, 0.5, 0, 0.75, 0, COL.gold); g.ball(0.3, 0, 1.5, 0, COL.skin); g.ball(0.33, 0, 1.68, -0.02, COL.white); g.box(0.12, 0.12, 0.12, 0, 1.5, 0.3, COL.recess);
    player.add(g.build(mats)); }
  player.position.set(0, 0, 9); scene.add(player);
  const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadowBlob.position.y = 0.06; scene.add(shadowBlob);

  // ---------- تسميات DOM ----------
  const labelsEl = document.getElementById("labels");
  const mkLabel = (cls, html) => { const d = document.createElement("div"); d.className = "lbl " + cls; d.innerHTML = html; labelsEl.appendChild(d); return d; };
  landmarks.forEach((l, i) => { l.label = mkLabel("unit", `${L.ar(i + 1)}. ${l.unit.title}<small>${l.unit.emblem}</small>`); l.labelPos = l.pos.clone().setY(i === 0 ? 19 : 13); });
  posts.forEach(p => { p.label = mkLabel("post", `${L.ref(p.lesson.n)} · ${p.lesson.title}`); p.labelPos = p.pos.clone().setY(3.5); });
  const boardLabel = mkLabel("unit", "خريطة المنهج<small>اضغط لفتحها</small>"); const boardPos = new THREE.Vector3(-5, 3.6, 6);
  const guideLabel = mkLabel("unit", "المرشد<small>مراجعة قبل الاختبار</small>"); const guidePos = new THREE.Vector3(5, 2.9, 6);

  // ---------- العناصر التفاعلية ----------
  const gatePos = landmarks.map(l => l.grp.localToWorld(new THREE.Vector3(0, 0, 7.2)));
  const inter = [
    ...posts.map(p => ({ pos: p.pos, r: 2.6, text: () => `${L.ref(p.lesson.n)} — ${p.lesson.title}`, btn: "اقرأ الدرس", act: () => L.openLesson(p.lesson.id) })),
    ...landmarks.map((l, i) => ({ pos: gatePos[i], r: 3.2, text: () => `بوابة ${l.unit.emblem}: اختبار «${l.unit.title}»` + (L.unitPassed(l.unit.id) ? " ✔" : ""), btn: "ادخل الاختبار", act: () => L.openQuiz(l.unit.id) })),
    { pos: new THREE.Vector3(-5, 0, 6), r: 3, text: () => "لوحة خريطة المنهج", btn: "افتح", act: () => L.openMap() },
    { pos: new THREE.Vector3(5, 0, 6), r: 3, text: () => "المرشد: أتراجع معي قبل الاختبار؟", btn: "مراجعة", act: () => L.reviewPicker() },
  ];

  // ---------- الحالة ----------
  const cNew = new THREE.Color(0x6b5847), cRead = new THREE.Color(0xffc95e), cMast = new THREE.Color(0x63f0d2);
  let beamTarget = null;
  function refresh() {
    posts.forEach((p, k) => {
      const st = L.lessonState(p.lesson.id);
      const c = st === "mastered" ? cMast : st === "read" ? cRead : cNew;
      lamps.setColorAt(k, c); halos.setColorAt(k, c);
      const s = st === "new" ? 0.0001 : st === "read" ? 0.85 : 1.15;
      halos.setMatrixAt(k, M(p.pos.x, 2.75, p.pos.z, 0, 0, 0, s, s, s));
    });
    lamps.instanceColor.needsUpdate = true; halos.instanceColor.needsUpdate = true; halos.instanceMatrix.needsUpdate = true;
    landmarks.forEach((l, i) => { gates[i].material = L.unitPassed(l.unit.id) ? gateMatOn : gateMatOff; });
    beamTarget = null;
    for (const p of posts) { if (L.lessonState(p.lesson.id) === "new") { beamTarget = p.pos; break; } }
    if (!beamTarget) { const i = landmarks.findIndex(l => !L.unitPassed(l.unit.id)); if (i >= 0) beamTarget = gatePos[i]; }
    beam.visible = !!beamTarget; if (beamTarget) beam.position.set(beamTarget.x, 30, beamTarget.z);
  }
  // ضمان وجود instanceColor قبل أول تحديث
  posts.forEach((p, k) => { lamps.setColorAt(k, cNew); halos.setColorAt(k, cNew); });
  refresh(); L.onChange(refresh);

  // ---------- الإدخال ----------
  const keys = new Set();
  let yaw = 0, pitch = 0.42, dist = 12, paused = false;
  const stick = { x: 0, y: 0, active: false };
  addEventListener("keydown", e => { if (paused || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return; keys.add(e.code); if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => keys.clear());
  const cv = renderer.domElement;
  let drag = null;
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * 0.006; pitch = Math.min(1.15, Math.max(0.12, pitch + dy * 0.004));
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  cv.addEventListener("pointerup", e => {
    if (drag && drag.moved < 8 && !paused) {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([lamps, pillars, halos, ...gates, board, guide], true)[0];
      if (hit) {
        if (hit.instanceId != null && (hit.object === lamps || hit.object === pillars || hit.object === halos)) L.openLesson(posts[hit.instanceId].lesson.id);
        else if (hit.object === board) L.openMap();
        else if (guide.getObjectById(hit.object.id)) L.reviewPicker();
        else { const gi = gates.indexOf(hit.object); if (gi >= 0) L.openQuiz(units[gi].id); }
      }
    }
    drag = null;
  });
  cv.addEventListener("wheel", e => { dist = Math.min(26, Math.max(5, dist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });
  // عصا الجوال
  const stickEl = document.getElementById("stick"), knob = stickEl.firstElementChild;
  const stickMove = e => { const r = stickEl.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.x = x; stick.y = y; knob.style.transform = `translate(${x * 34}px,${y * 34}px)`; };
  stickEl.addEventListener("pointerdown", e => { stick.active = true; stickEl.setPointerCapture(e.pointerId); stickMove(e); e.stopPropagation(); });
  stickEl.addEventListener("pointermove", e => stick.active && stickMove(e));
  const stickEnd = () => { stick.active = false; stick.x = stick.y = 0; knob.style.transform = ""; };
  stickEl.addEventListener("pointerup", stickEnd); stickEl.addEventListener("pointercancel", stickEnd);

  addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  // ---------- الأداء ----------
  function setLow(v) {
    low = !!v;
    renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.25 : 2));
    renderer.shadowMap.enabled = !low; sun.castShadow = !low; motes.visible = !low;
    matCache.forEach(m => m.needsUpdate = true); gateMatOn.needsUpdate = gateMatOff.needsUpdate = true;
    ground.material.needsUpdate = true; water.material.needsUpdate = true;
  }

  // ---------- الحلقة ----------
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  let lastPrompt = null;
  let facing = Math.PI, bob = 0, fpsAcc = 0, fpsN = 0, autoChecked = false, elapsed = 0;
  const lmColliders = landmarks.map(l => ({ c: l.center, r: 7.8 }));
  lmColliders.push({ c: new THREE.Vector3(0, 0, 0), r: 3.8 });

  function step(dt) {
    let mx = 0, mz = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyQ")) yaw += dt * 1.8; if (keys.has("KeyZ")) yaw -= dt * 1.8;
    if (stick.active) { mx = stick.x; mz = -stick.y; }
    const mag = Math.min(1, Math.hypot(mx, mz));
    if (mag > 0.05) {
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      tmp.copy(fwd).multiplyScalar(mz).addScaledVector(right, mx).normalize();
      const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 12 : 7.5) * mag;
      player.position.addScaledVector(tmp, speed * dt);
      const target = Math.atan2(tmp.x, tmp.z);
      let d = target - facing; d = Math.atan2(Math.sin(d), Math.cos(d)); facing += d * Math.min(1, dt * 12);
      bob += dt * speed * 1.6;
    }
    // تصادم
    lmColliders.forEach(({ c, r }) => { tmp.set(player.position.x - c.x, 0, player.position.z - c.z); const l = tmp.length(); if (l < r) player.position.addScaledVector(tmp.normalize(), r - l); });
    const pr = Math.hypot(player.position.x, player.position.z); if (pr > 56) player.position.multiplyScalar(56 / pr);
    player.rotation.y = facing; player.position.y = Math.abs(Math.sin(bob)) * 0.08;
    shadowBlob.position.set(player.position.x, 0.06, player.position.z);
    // الكاميرا
    const cp = Math.cos(pitch);
    camera.position.set(player.position.x + Math.sin(yaw) * cp * dist, 1.6 + Math.sin(pitch) * dist, player.position.z + Math.cos(yaw) * cp * dist);
    camera.lookAt(player.position.x, 1.6, player.position.z);
    // أقرب عنصر تفاعلي
    let best = null, bd = 1e9;
    for (const it of inter) { const d = Math.hypot(it.pos.x - player.position.x, it.pos.z - player.position.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    const key = best ? best.text() : "";
    if (key !== lastPrompt) { lastPrompt = key; L.setPrompt(best && !L.isOpen() ? { text: key, btn: best.btn, act: best.act } : null); }
  }
  const proj = new THREE.Vector3();
  function placeLabel(el, pos, maxD) {
    const d = camera.position.distanceTo(pos);
    proj.copy(pos).project(camera);
    if (proj.z > 1 || d > maxD) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.style.left = ((proj.x + 1) / 2 * innerWidth) + "px"; el.style.top = ((1 - proj.y) / 2 * innerHeight) + "px";
    el.style.opacity = String(Math.max(0.25, Math.min(1, (maxD - d) / (maxD * 0.35))));
  }
  function frameLoop() {
    requestAnimationFrame(frameLoop);
    if (paused) return;
    const dt = Math.min(0.05, clock.getDelta()); elapsed += dt;
    step(dt);
    water.material.emissiveIntensity = 0.5 + Math.sin(elapsed * 2.2) * 0.15;
    halos.material.opacity = 0.24 + Math.sin(elapsed * 3) * 0.06;
    beam.material.opacity = 0.16 + Math.sin(elapsed * 2) * 0.07;
    guide.rotation.y = -0.6 + Math.sin(elapsed * 0.8) * 0.15;
    if (motes.visible) { motes.rotation.y += dt * 0.01; motes.position.y = Math.sin(elapsed * 0.3) * 0.4; }
    renderer.render(scene, camera);
    landmarks.forEach(l => placeLabel(l.label, l.labelPos, 95));
    posts.forEach(p => placeLabel(p.label, p.labelPos, 13));
    placeLabel(boardLabel, boardPos, 30); placeLabel(guideLabel, guidePos, 30);
    // خفض الجودة تلقائيًا إن ضعف الأداء
    if (!autoChecked && !low && elapsed > 2) { fpsAcc += dt; fpsN++; if (fpsAcc > 4) { autoChecked = true; if (fpsN / fpsAcc < 28 && L.prefLow() == null) { setLow(true); L.toast("خُفضت الجودة لتسريع الحركة"); } } }
  }
  frameLoop();

  const api = {
    pause(v) { paused = !!v; lastPrompt = null; if (v) { keys.clear(); L.setPrompt(null); labelsEl.style.visibility = "hidden"; } else { clock.getDelta(); labelsEl.style.visibility = ""; } },
    goTo(id) {
      let target, look;
      const p = posts.find(x => x.lesson.id === id);
      if (p) { target = p.pos; look = landmarks[p.i].pos; }
      else { const i = units.findIndex(u => u.id === id); if (i < 0) return; target = gatePos[i]; look = landmarks[i].pos; }
      tmp.set(-look.x, 0, -look.z).normalize();
      player.position.set(target.x + tmp.x * 2.4, 0, target.z + tmp.z * 2.4);
      yaw = Math.atan2(tmp.x, tmp.z); facing = yaw + Math.PI; pitch = 0.4; dist = 10;
    },
    isLow: () => low, setLow,
  };
  L.worldReady(api);
  return api;
}
