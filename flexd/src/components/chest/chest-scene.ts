import * as THREE from "three";
import { brand } from "@/config/brand";
import { LOGO_ASPECT, LOGO_SRC } from "@/config/mark";
import type { BoxMaterial } from "@/domain/types";
import { CLASP, FINISHES, INTERIOR, type Finish } from "./chest-finishes";

/**
 * The FLEXD box in WebGL, after the client's first screen: a holographic box with a lid a third of
 * its height, a champagne-gold clasp down the front, the crown on the lid, the wordmark on the front
 * and the categories on the side. It stands on a dark floor that reflects it faintly. Opening lights
 * the velvet inside and sends light and motes up out of the box.
 *
 * Plain three.js (no React) so it can be imported lazily, after first paint.
 */

/** Overall proportions, in scene units. */
const W = 2.1;
const D = 1.5;
const H = 0.86;
const LID = 0.46;
const R = 0.06;
const WALL = 0.06;
const BEVEL = 0.018;
const CLASP_W = 0.24;
const CLASP_T = 0.035;
/** Height of the lowest point of the box at rest: just above the floor, which sits at y = 0. */
const REST_Y = 0.004;

function roundedRect(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A rounded rectangle that comes out exactly w by d once extruded with this bevel (bevels grow the outline). */
function outline(w: number, d: number, r: number, bevel: number): THREE.Shape {
  return roundedRect(w - bevel * 2, d - bevel * 2, Math.max(r - bevel, 0.004));
}

/** Extrudes a plan-view shape upward (three extrudes along +Z; the plan lies in XZ). */
function extrudeUp(shape: THREE.Shape, height: number, bevel: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

/** A thin dark line along a rounded rectangle at height y (the seam between lid and body). */
function seamLine(w: number, d: number, r: number, y: number, mat: THREE.Material) {
  const pts = roundedRect(w, d, r).getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, y, -p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.0028, 6, true), mat);
}

function canvasTexture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,246,222,1)");
  grad.addColorStop(0.35, "rgba(240,205,140,0.55)");
  grad.addColorStop(1, "rgba(240,205,140,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return canvasTexture(c, true);
}

function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.8)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return canvasTexture(c, false);
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * The holographic foil: a diagonal base sheen with a few soft rainbow streaks and faint creases (the
 * foil in the client's screens). Deterministic, so stills are stable.
 */
function foilTexture(finish: Finish): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const sheen = g.createLinearGradient(0, 0, S, S);
  [0, 0.4, 0.75, 1].forEach((at, i) => sheen.addColorStop(at, finish.base[i % 2]));
  g.fillStyle = sheen;
  g.fillRect(0, 0, S, S);

  // Streaks run at 45 degrees; each blends through the finish's colours across its width.
  const streaks = [
    { at: 0.25, width: 0.34 },
    { at: 0.78, width: 0.3 },
  ];
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(-Math.PI / 4);
  streaks.forEach(({ at, width }, k) => {
    const x = (at - 0.5) * S * 1.4;
    const w = width * S;
    const grad = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grad.addColorStop(0, rgba(finish.streaks[k % finish.streaks.length], 0));
    finish.streaks.forEach((color, i) => grad.addColorStop(0.2 + (0.6 * i) / Math.max(1, finish.streaks.length - 1), rgba(color, 0.5)));
    grad.addColorStop(1, rgba(finish.streaks[(k + 1) % finish.streaks.length], 0));
    g.fillStyle = grad;
    g.fillRect(x - w / 2, -S, w, S * 2);
  });
  g.restore();

  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(rand() * S, rand() * S);
    g.lineTo(rand() * S, rand() * S);
    g.lineTo(rand() * S, rand() * S);
    g.closePath();
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.03)";
    g.fill();
  }
  const t = canvasTexture(c, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // Extrude UVs are in scene units; one texture spans about the width of the box.
  t.repeat.set(0.3, 0.3);
  return t;
}

/** White print on black, for use as an alpha map (three reads alpha maps from the green channel). */
function printTexture(
  lines: string[],
  { family, px, tracking, gap, width, height, mark = false }: { family: string; px: number; tracking: number; gap: number; width: number; height: number; mark?: boolean },
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, width, height);
  g.fillStyle = "#fff";
  g.textBaseline = "middle";
  g.font = `400 ${px}px ${family}`;
  const advance = (s: string) => [...s].reduce((sum, ch) => sum + g.measureText(ch).width + px * tracking, -px * tracking);
  const total = lines.length * px + (lines.length - 1) * gap;
  lines.forEach((line, i) => {
    const text = line.toUpperCase();
    let x = (width - advance(text)) / 2;
    const y = (height - total) / 2 + px / 2 + i * (px + gap);
    for (const ch of text) {
      g.fillText(ch, x, y);
      x += g.measureText(ch).width + px * tracking;
    }
    if (mark) {
      g.font = `400 ${Math.round(px * 0.28)}px ${family}`;
      g.fillText("TM", x - px * tracking + px * 0.12, y - px * 0.36);
    }
  });
  return canvasTexture(c, false);
}

/** The reflection studio: a dark room lit by softboxes and coloured panels (box size, position, colour, power). */
function studioScene(): THREE.Scene {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: 0x24202c, side: THREE.BackSide }));
  room.position.y = 6;
  s.add(room);
  // The camera looks down on the box, so its sides mirror the floor and its lid the back wall.
  const panels: [number[], number[], number, number][] = [
    [[26, 0.1, 18], [0, -3.9, 5], 0xf0edf6, 1.3],
    [[2, 0.1, 10], [-8, -3.85, 6], 0x9a5cff, 1.6],
    [[1.6, 0.1, 9], [8, -3.85, -1], 0x5a9cff, 1.3],
    [[1.4, 0.1, 6], [3, -3.85, 11], 0xff7ac8, 1.1],
    [[10, 6, 0.1], [-1, 7, -14.9], 0xffffff, 1],
    [[4, 7, 0.1], [9, 6, -14.9], 0xff66bf, 2.4],
    [[4, 7, 0.1], [-10, 6, -14.9], 0x8c4dff, 2.6],
    [[12, 0.1, 8], [0, 15.9, -2], 0xffffff, 1.4],
    [[0.1, 10, 3], [-14.9, 6, -1], 0xffffff, 3],
    [[0.1, 8, 2], [14.9, 5, -5], 0xffffff, 2.5],
  ];
  for (const [size, pos, color, power] of panels) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...(size as [number, number, number])), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }));
    m.position.fromArray(pos);
    s.add(m);
  }
  return s;
}

/**
 * three.js reads alpha maps from the green channel, so the logo's transparency is copied into the
 * colour channels of a mask texture.
 */
function alphaMask(src: string, onLoad: (t: THREE.CanvasTexture) => void) {
  const img = new window.Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const a = data.data[i + 3];
      data.data[i] = data.data[i + 1] = data.data[i + 2] = a;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
    onLoad(canvasTexture(c, false));
  };
  img.src = src;
}

/**
 * The floor reflection's copy of a material: transparent, fading with depth below the floor, so the
 * mirrored box reads as a soft reflection on a glossy floor.
 */
function reflected<T extends THREE.Material>(mat: T): T {
  const m = mat.clone() as T;
  m.transparent = true;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vBelowFloor;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvBelowFloor = -(modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vBelowFloor;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= 0.2 * exp(-4.5 * max(vBelowFloor, 0.0));");
  };
  m.customProgramCacheKey = () => "flexd-reflection";
  return m;
}

export interface ChestSceneOptions {
  finish: BoxMaterial;
  /** Rest pose camera yaw in radians (negative shows the right side). */
  yaw?: number;
  /** Keep the drawing buffer so the frame can be exported (the still renderer). */
  capture?: boolean;
}

/** Every material of the box, each with its reflection twin. */
interface Materials {
  foil: THREE.MeshPhysicalMaterial;
  clasp: THREE.MeshPhysicalMaterial;
  seam: THREE.MeshBasicMaterial;
  crown: THREE.MeshPhysicalMaterial;
  emblem: THREE.MeshPhysicalMaterial;
  wordmark: THREE.MeshPhysicalMaterial;
  sideLines: THREE.MeshPhysicalMaterial;
}

export class ChestScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private rig = new THREE.Group();
  private chest = new THREE.Group();
  private hinge = new THREE.Group();
  private mirrorChest = new THREE.Group();
  private mirrorHinge = new THREE.Group();
  private innerLight: THREE.PointLight;
  private velvet!: THREE.MeshPhysicalMaterial;
  private beam: THREE.Mesh;
  private motes: THREE.Points;
  private moteSeeds: Float32Array;
  private disposables: { dispose(): void }[] = [];
  private frame = 0;
  private running = false;
  private t0 = performance.now();
  private yaw: number;

  open = 0;
  float = false;
  shake = false;
  private pointer = new THREE.Vector2();
  private tilt = new THREE.Vector2();
  /** Called after every rendered frame (the React wrapper uses it to reveal the canvas). */
  onFrame: (() => void) | null = null;
  private pending = 0;
  private settle: (() => void) | null = null;
  /** Resolves once every texture has loaded (the still renderer waits for it). */
  readonly ready = new Promise<void>((resolve) => {
    this.settle = resolve;
  });

  private loading() {
    this.pending += 1;
    return () => {
      this.pending -= 1;
      this.requestRender();
      if (this.pending === 0) this.settle?.();
    };
  }

  constructor(canvas: HTMLCanvasElement, { finish, yaw = -0.62, capture = false }: ChestSceneOptions) {
    this.yaw = yaw;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: capture, powerPreference: "high-performance" });
    // 1.75x is visually indistinguishable from 2x on a phone and much cheaper to fill.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // A dark studio with white softboxes and violet, blue and pink panels: chrome needs dark and bright
    // areas to reflect, and the holographic foil picks up the colours.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = studioScene();
    const env = pmrem.fromScene(studio, 0.03).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 1;
    studio.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    pmrem.dispose();
    this.disposables.push(env);

    this.camera.position.set(0, 3, 5.6);
    this.camera.lookAt(0, 0.45, 0);

    const key = new THREE.DirectionalLight(0xfff4e8, 1.6);
    key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(INTERIOR.rimLight, INTERIOR.rimIntensity);
    rim.position.set(4, 2.5, -4);
    const fill = new THREE.HemisphereLight(0xf2e9ff, INTERIOR.fillGround, 0.3);
    this.scene.add(key, rim, fill);

    this.build(finish);
    // Finishes without a texture have nothing to wait for.
    if (this.pending === 0) this.settle?.();

    this.innerLight = new THREE.PointLight(0xffd79a, 0, 6, 1.6);
    this.innerLight.position.set(0, H * 0.75, 0);
    this.chest.add(this.innerLight);

    // Light rising out of the open box: an additive glow card that always faces the camera.
    const glow = glowTexture();
    const beamMat = new THREE.MeshBasicMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), beamMat);
    this.beam.position.set(0, H + 1.2, 0);
    this.chest.add(this.beam);

    const count = 70;
    const positions = new Float32Array(count * 3);
    this.moteSeeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.moteSeeds[i * 3] = (Math.random() - 0.5) * (W - 0.5);
      this.moteSeeds[i * 3 + 1] = Math.random();
      this.moteSeeds[i * 3 + 2] = (Math.random() - 0.5) * (D - 0.4);
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const moteMat = new THREE.PointsMaterial({ map: glow, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2a8, opacity: 0 });
    this.motes = new THREE.Points(moteGeo, moteMat);
    this.chest.add(this.motes);

    // Contact shadow, drawn over the reflection.
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.7, D * 1.9),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    shadow.renderOrder = 1;
    this.rig.add(shadow);

    // The reflection: the same box mirrored below the floor, drawn first.
    const mirror = new THREE.Group();
    mirror.scale.y = -1;
    mirror.add(this.mirrorChest);
    mirror.traverse((o) => (o.renderOrder = -1));
    this.rig.add(mirror, this.chest);
    this.scene.add(this.rig);
    this.disposables.push(glow, beamMat, moteGeo, moteMat, shadow.material as THREE.Material, (shadow.material as THREE.MeshBasicMaterial).map!);
  }

  /** A material and its reflection twin; textures set later go to both. */
  private twin<T extends THREE.Material>(mat: T): [T, T] {
    const copy = reflected(mat);
    this.disposables.push(mat, copy);
    return [mat, copy];
  }

  private build(finishKey: BoxMaterial) {
    const finish = FINISHES[finishKey];
    const foilMap = foilTexture(finish);
    this.disposables.push(foilMap);
    const ink = { color: finish.ink.color, metalness: finish.ink.metalness, roughness: finish.ink.roughness, transparent: true, opacity: 0, depthWrite: false };
    const pairs = {
      foil: this.twin(
        new THREE.MeshPhysicalMaterial({
          map: foilMap,
          metalness: finish.metalness,
          roughness: finish.roughness,
          iridescence: finish.iridescence,
          iridescenceIOR: 1.7,
          iridescenceThicknessRange: [220, 680],
          clearcoat: 0.3,
          clearcoatRoughness: 0.3,
        }),
      ),
      clasp: this.twin(new THREE.MeshPhysicalMaterial({ ...CLASP, clearcoat: 0.2 })),
      seam: this.twin(new THREE.MeshBasicMaterial({ color: 0x0b0710 })),
      crown: this.twin(new THREE.MeshPhysicalMaterial(ink)),
      emblem: this.twin(new THREE.MeshPhysicalMaterial({ ...ink, color: 0x2a2018, metalness: 0.6 })),
      wordmark: this.twin(new THREE.MeshPhysicalMaterial(ink)),
      sideLines: this.twin(new THREE.MeshPhysicalMaterial(ink)),
    };
    const main = Object.fromEntries(Object.entries(pairs).map(([k, [m]]) => [k, m])) as unknown as Materials;
    const mirror = Object.fromEntries(Object.entries(pairs).map(([k, [, m]]) => [k, m])) as unknown as Materials;

    /** Gives a printed or inlaid part its mask and shows it, on the box and in the reflection. */
    const reveal = (key: "crown" | "emblem" | "wordmark" | "sideLines", mask: THREE.Texture) => {
      for (const m of pairs[key]) {
        m.alphaMap = mask;
        m.opacity = 1;
        m.needsUpdate = true;
      }
      this.disposables.push(mask);
    };

    const crownDone = this.loading();
    alphaMask(LOGO_SRC, (mask) => {
      reveal("crown", mask);
      reveal("emblem", mask);
      crownDone();
    });

    // The print waits for the text face, so the stills never catch a fallback font.
    const printDone = this.loading();
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "sans-serif";
    void document.fonts
      .load(`400 64px ${family}`)
      .catch(() => undefined)
      .then(() => {
        reveal("wordmark", printTexture([brand.name], { family, px: 112, tracking: 0.55, gap: 0, width: 1024, height: 192, mark: true }));
        reveal("sideLines", printTexture([...brand.boxSideLines], { family, px: 58, tracking: 0.3, gap: 26, width: 560, height: 448 }));
        printDone();
      });

    this.velvet = new THREE.MeshPhysicalMaterial({
      color: INTERIOR.lining,
      roughness: 1,
      sheen: 1,
      sheenColor: new THREE.Color(INTERIOR.liningSheen),
      sheenRoughness: 0.35,
      emissive: new THREE.Color(0xffc879),
      emissiveIntensity: 0,
    });
    this.disposables.push(this.velvet);

    this.buildBox(this.chest, this.hinge, main, true);
    this.buildBox(this.mirrorChest, this.mirrorHinge, mirror, false);
  }

  /** One box: the body (with its lining when `inside`) and the lid on its hinge. */
  private buildBox(target: THREE.Group, hinge: THREE.Group, m: Materials, inside: boolean) {
    // Body: a ring of walls, open at the top, on a base.
    const ring = outline(W, D, R, BEVEL);
    ring.holes.push(roundedRect(W - WALL * 2, D - WALL * 2, R * 0.5));
    target.add(new THREE.Mesh(extrudeUp(ring, H, BEVEL), m.foil));
    target.add(new THREE.Mesh(extrudeUp(outline(W, D, R, BEVEL), WALL, BEVEL), m.foil));
    if (inside) {
      const floor = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - WALL * 2, D - WALL * 2, R * 0.5)), this.velvet);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = WALL + 0.002;
      const liningMat = new THREE.MeshPhysicalMaterial({ color: INTERIOR.lining, roughness: 1, sheen: 1, sheenColor: new THREE.Color(INTERIOR.liningSheen), side: THREE.BackSide });
      const lining = new THREE.Mesh(extrudeUp(roundedRect(W - WALL * 2 + 0.002, D - WALL * 2 + 0.002, R * 0.5), H - WALL - 0.02, 0), liningMat);
      lining.position.y = WALL;
      this.disposables.push(liningMat);
      target.add(floor, lining);
    }
    target.add(seamLine(W + 0.002, D + 0.002, R, H, m.seam));

    // Clasp, lower half: a gold plate below the seam with the crown engraved on it.
    const plate = new THREE.Mesh(extrudeUp(outline(CLASP_W, CLASP_T, 0.012, 0.006), 0.42, 0.006), m.clasp);
    plate.position.set(0, H - 0.42, D / 2 + CLASP_T / 2);
    const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15 / LOGO_ASPECT), m.emblem);
    emblem.position.set(0, H - 0.25, D / 2 + CLASP_T + 0.002);
    target.add(plate, emblem);

    // Print: the wordmark on the front, left of the clasp; the categories on the right side.
    const wordmark = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.154), m.wordmark);
    wordmark.position.set(-(W / 2 + CLASP_W / 2) / 2, H * 0.5, D / 2 + 0.002);
    const sideLines = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), m.sideLines);
    sideLines.rotation.y = Math.PI / 2;
    sideLines.position.set(W / 2 + 0.002, H * 0.48, -0.18);
    target.add(wordmark, sideLines);

    // Lid on a hinge at the back top edge.
    hinge.position.set(0, H, -D / 2);
    const lid = new THREE.Group();
    lid.position.set(0, 0, D / 2);
    lid.add(new THREE.Mesh(extrudeUp(outline(W, D, R, BEVEL), LID, BEVEL), m.foil));
    if (inside) {
      const lidVelvet = new THREE.MeshPhysicalMaterial({ color: INTERIOR.lid, roughness: 1, sheen: 1, sheenColor: new THREE.Color(INTERIOR.lidSheen), sheenRoughness: 0.4 });
      this.disposables.push(lidVelvet);
      const under = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - WALL * 2, D - WALL * 2, R * 0.5)), lidVelvet);
      under.rotation.x = Math.PI / 2;
      under.position.y = -0.002;
      lid.add(under);
    }
    // Clasp, upper half: down the lid's front from a tab on its top edge.
    const strap = new THREE.Mesh(extrudeUp(outline(CLASP_W, CLASP_T, 0.012, 0.006), LID + 0.012, 0.006), m.clasp);
    strap.position.set(0, 0.004, D / 2 + CLASP_T / 2);
    const tab = new THREE.Mesh(extrudeUp(outline(CLASP_W, 0.14, 0.012, 0.004), 0.014, 0.004), m.clasp);
    tab.position.set(0, LID, D / 2 - 0.05);
    lid.add(strap, tab);
    // The crown on the lid.
    const crown = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86 / LOGO_ASPECT), m.crown);
    crown.rotation.x = -Math.PI / 2;
    crown.position.set(0, LID + 0.003, -0.06);
    lid.add(crown);

    hinge.add(lid);
    target.add(hinge);
    target.position.y = REST_Y;
  }

  /** Compiles every shader before the first frame, in parallel where the GPU driver allows. */
  async warm() {
    const gl = this.renderer.getContext();
    if (gl.getExtension("KHR_parallel_shader_compile")) await this.renderer.compileAsync(this.scene, this.camera);
    else this.renderer.compile(this.scene, this.camera);
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
    this.requestRender();
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Keep the whole box in frame on narrow canvases.
    this.camera.fov = width / height < 1 ? 28 / Math.max(0.62, width / height) : 28;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private needsFrame = true;

  requestRender() {
    this.needsFrame = true;
    if (!this.running) this.renderFrame();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.renderFrame();
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private renderFrame() {
    const t = (performance.now() - this.t0) / 1000;
    const open = THREE.MathUtils.clamp(this.open, 0, 1);

    // Pull back and look higher as the lid swings up, so the open lid stays in frame.
    const ease = open * open * (3 - 2 * open);
    this.camera.position.set(0, 3 - ease * 0.6, 5.6 + ease * 1.6);
    this.camera.lookAt(0, 0.45 + ease * 0.7, 0);

    this.tilt.lerp(this.pointer, 0.08);
    const bob = this.float ? (Math.sin(t * 1.3) + 1) * 0.05 : 0;
    const sway = this.float ? Math.sin(t * 0.6) * 0.07 : 0;
    const jitter = this.shake ? Math.sin(t * 60) * 0.025 : 0;
    this.rig.rotation.y = this.yaw + sway + this.tilt.x * 0.25;
    this.rig.rotation.x = this.tilt.y * 0.08;
    const y = REST_Y + bob + (this.shake ? Math.abs(Math.sin(t * 40)) * 0.02 : 0);
    this.chest.position.y = this.mirrorChest.position.y = y;
    this.chest.rotation.z = jitter;
    this.mirrorChest.rotation.z = -jitter;

    // A lid that swings to 108 degrees, easing at the end of its travel.
    this.hinge.rotation.x = this.mirrorHinge.rotation.x = -open * 1.88;
    this.innerLight.intensity = open * 9;
    this.velvet.emissiveIntensity = open * 0.55;
    const beamMat = this.beam.material as THREE.MeshBasicMaterial;
    beamMat.opacity = Math.max(0, open - 0.15) * 0.85;
    this.beam.quaternion.copy(this.camera.quaternion);
    this.beam.scale.setScalar(0.6 + open * 0.6);

    const moteMat = this.motes.material as THREE.PointsMaterial;
    moteMat.opacity = Math.max(0, open - 0.35) * 1.4;
    if (moteMat.opacity > 0) {
      const pos = this.motes.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const life = (this.moteSeeds[i * 3 + 1] + t * 0.18) % 1;
        pos.setXYZ(
          i,
          this.moteSeeds[i * 3] * (1 - life * 0.5) + Math.sin(t + i) * 0.05,
          H * 0.6 + life * 2.4,
          this.moteSeeds[i * 3 + 2] * (1 - life * 0.5),
        );
      }
      pos.needsUpdate = true;
    }

    if (this.running || this.needsFrame) {
      this.renderer.render(this.scene, this.camera);
      this.needsFrame = false;
      this.onFrame?.();
    }
  }

  dispose() {
    this.stop();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}
