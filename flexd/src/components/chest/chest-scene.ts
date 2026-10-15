import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { BoxMaterial } from "@/domain/types";

/**
 * The Grail Noir jewelry chest in WebGL: a hollow body with rounded corners, a hinged lid, gold
 * piping, a lock plate with a keyhole, ball feet and the crown on the lid. Finishes are physical
 * materials lit by a studio environment, so lacquer, marble, leather and gold read as real
 * surfaces. Opening lights the velvet inside and sends light and motes up out of the box.
 *
 * Plain three.js (no React) so it can be imported lazily, after first paint.
 */

/** Overall proportions, in scene units. */
const W = 2.1;
const D = 1.45;
const H = 0.95;
const LID = 0.36;
const R = 0.16;
const WALL = 0.09;

interface Finish {
  body: () => THREE.MeshPhysicalMaterialParameters;
  /** Crown colour and metalness on the lid. */
  crown: { color: number; metalness: number; roughness: number };
  texture?: "leather" | "marble-dark" | "marble-light";
}

/** Finishes in burgundy and gold (keys are the catalogue's material names). */
const FINISHES: Record<BoxMaterial, Finish> = {
  navy: {
    body: () => ({ color: 0x4a0f1e, roughness: 0.58, sheen: 0.35, sheenColor: new THREE.Color(0x9f1d35), sheenRoughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    crown: { color: 0xe8c27a, metalness: 1, roughness: 0.25 },
    texture: "leather",
  },
  obsidian: {
    body: () => ({ color: 0x9c8460, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 }),
    crown: { color: 0xe8c27a, metalness: 1, roughness: 0.22 },
    texture: "marble-dark",
  },
  sapphire: {
    body: () => ({ color: 0x5a0016, roughness: 0.2, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    crown: { color: 0xf2d9a4, metalness: 1, roughness: 0.2 },
  },
  ivory: {
    body: () => ({ color: 0xf6ecdf, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) }),
    crown: { color: 0x650015, metalness: 0.2, roughness: 0.45 },
    texture: "marble-light",
  },
  bronze: {
    body: () => ({ color: 0xa87a3e, metalness: 1, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
    crown: { color: 0x4a0010, metalness: 0.3, roughness: 0.4 },
  },
  gold: {
    body: () => ({ color: 0xd9b26a, metalness: 1, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    crown: { color: 0x4a0010, metalness: 0.3, roughness: 0.4 },
  },
};

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

/** Extrudes a plan-view shape upward (three extrudes along +Z; the plan lies in XZ). */
function extrudeUp(shape: THREE.Shape, height: number, bevel: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 14,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

/** Gold piping along a rounded rectangle at height y. */
function piping(w: number, d: number, r: number, y: number, radius: number, mat: THREE.Material) {
  const pts = roundedRect(w, d, r).getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, y, -p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 240, radius, 10, true), mat);
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
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.75)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.3)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
    onLoad(new THREE.CanvasTexture(c));
  };
  img.src = src;
}

export interface ChestSceneOptions {
  finish: BoxMaterial;
  /** Rest pose camera yaw in radians (negative shows the right side). */
  yaw?: number;
  /** Keep the drawing buffer so the frame can be exported (the still renderer). */
  capture?: boolean;
}

export class ChestScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private rig = new THREE.Group();
  private chest = new THREE.Group();
  private hinge = new THREE.Group();
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
    this.renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.035).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.9;
    room.dispose();
    pmrem.dispose();
    this.disposables.push(env);

    this.camera.position.set(0, 3, 5.6);
    this.camera.lookAt(0, 0.35, 0);

    const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(0xb02a45, 1.7);
    rim.position.set(4, 2.5, -4);
    const fill = new THREE.HemisphereLight(0xffe9e0, 0x1c0a10, 0.35);
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

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.9, D * 2.2),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.11;
    this.rig.add(shadow);

    this.rig.add(this.chest);
    this.scene.add(this.rig);
    this.disposables.push(glow, beamMat, moteGeo, moteMat);
  }

  private texture(name: "leather" | "marble-dark" | "marble-light", repeat: number) {
    const done = this.loading();
    const t = new THREE.TextureLoader().load(`/textures/${name}.webp`, done, undefined, done);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = name === "leather" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.disposables.push(t);
    return t;
  }

  private build(finishKey: BoxMaterial) {
    const finish = FINISHES[finishKey];
    const params = finish.body();
    if (finish.texture === "leather") {
      const bump = this.texture("leather", 3.2);
      Object.assign(params, { bumpMap: bump, bumpScale: 0.55 });
    } else if (finish.texture) {
      Object.assign(params, { map: this.texture(finish.texture, 0.3) });
    }
    const body = new THREE.MeshPhysicalMaterial(params);
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2c07c, metalness: 1, roughness: 0.22, clearcoat: 0.3 });
    this.velvet = new THREE.MeshPhysicalMaterial({
      color: 0x650015,
      roughness: 1,
      sheen: 1,
      sheenColor: new THREE.Color(0xc73a52),
      sheenRoughness: 0.35,
      emissive: new THREE.Color(0xffc879),
      emissiveIntensity: 0,
    });
    const dark = new THREE.MeshBasicMaterial({ color: 0x050507 });
    this.disposables.push(body, gold, this.velvet, dark);

    // Body: a rounded ring of walls, open at the top, on a base.
    const ring = roundedRect(W, D, R);
    ring.holes.push(roundedRect(W - WALL * 2, D - WALL * 2, R - WALL * 0.6));
    const walls = new THREE.Mesh(extrudeUp(ring, H, 0.03), body);
    const base = new THREE.Mesh(extrudeUp(roundedRect(W, D, R), WALL, 0.03), body);
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - WALL * 2, D - WALL * 2, R - WALL)), this.velvet);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = WALL + 0.002;
    // Velvet lining on the inner walls.
    const lining = new THREE.Mesh(
      extrudeUp(roundedRect(W - WALL * 2 + 0.002, D - WALL * 2 + 0.002, R - WALL * 0.6), H - WALL - 0.04, 0),
      new THREE.MeshPhysicalMaterial({ color: 0x650015, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xc73a52), side: THREE.BackSide }),
    );
    lining.position.y = WALL;
    this.disposables.push(lining.material as THREE.Material);
    this.chest.add(walls, base, floor, lining);
    this.chest.add(piping(W + 0.01, D + 0.01, R, H - 0.015, 0.022, gold));
    this.chest.add(piping(W + 0.01, D + 0.01, R, 0.05, 0.02, gold));

    // Feet.
    const footGeo = new THREE.SphereGeometry(0.085, 20, 14);
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const foot = new THREE.Mesh(footGeo, gold);
      foot.position.set(x * (W / 2 - 0.2), -0.03, z * (D / 2 - 0.18));
      this.chest.add(foot);
    }
    this.disposables.push(footGeo);

    // Lock plate and keyhole on the front.
    // extrudeUp stands it upright: 0.34 wide, 0.42 tall, 0.05 thick, just proud of the wall.
    const plate = new THREE.Mesh(extrudeUp(roundedRect(0.26, 0.05, 0.02), 0.3, 0.012), gold);
    plate.position.set(0, H - 0.33, D / 2 + 0.05);
    const keyShape = new THREE.Shape();
    keyShape.absarc(0, 0.04, 0.045, 0, Math.PI * 2, false);
    const slot = new THREE.Shape();
    slot.moveTo(-0.022, 0.02);
    slot.lineTo(0.022, 0.02);
    slot.lineTo(0.04, -0.11);
    slot.lineTo(-0.04, -0.11);
    slot.closePath();
    const keyhole = new THREE.Group();
    for (const s of [keyShape, slot]) {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), dark);
      keyhole.add(m);
    }
    keyhole.scale.setScalar(0.8);
    keyhole.position.set(0, H - 0.17, D / 2 + 0.09);
    this.chest.add(plate, keyhole);

    // Lid on a hinge at the back top edge.
    this.hinge.position.set(0, H, -D / 2);
    const lid = new THREE.Group();
    lid.position.set(0, 0, D / 2);
    const lidBody = new THREE.Mesh(extrudeUp(roundedRect(W + 0.04, D + 0.04, R + 0.02), LID, 0.07), body);
    const lidVelvet = new THREE.MeshPhysicalMaterial({ color: 0x4a0010, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0x9f1d35), sheenRoughness: 0.4 });
    this.disposables.push(lidVelvet);
    const lidUnder = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - WALL * 2, D - WALL * 2, R - WALL)), lidVelvet);
    lidUnder.rotation.x = Math.PI / 2;
    lidUnder.position.y = 0.004;
    lid.add(lidBody, lidUnder);
    lid.add(piping(W + 0.05, D + 0.05, R + 0.02, 0.02, 0.022, gold));
    // Hasp hanging over the lock plate.
    const hasp = new THREE.Mesh(extrudeUp(roundedRect(0.16, 0.04, 0.02), 0.16, 0.01), gold);
    hasp.position.set(0, -0.1, D / 2 + 0.12);
    lid.add(hasp);

    // Crown on the lid: the logo's alpha as a foil (or ink) inlay.
    const crownMat = new THREE.MeshPhysicalMaterial({
      color: finish.crown.color,
      metalness: finish.crown.metalness,
      roughness: finish.crown.roughness,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const crownDone = this.loading();
    alphaMask("/brand/grail-noir-mark.webp", (mask) => {
      crownMat.alphaMap = mask;
      crownMat.opacity = 1;
      crownMat.needsUpdate = true;
      this.disposables.push(mask);
      crownDone();
    });
    const crown = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9 * (472 / 711)), crownMat);
    crown.rotation.x = -Math.PI / 2;
    crown.position.set(0, LID + 0.003, 0.05);
    lid.add(crown);
    this.disposables.push(crownMat);


    this.hinge.add(lid);
    this.chest.add(this.hinge);
    this.chest.position.y = 0.06;
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
    // Keep the whole chest in frame on narrow canvases.
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
    this.camera.lookAt(0, 0.35 + ease * 0.7, 0);

    this.tilt.lerp(this.pointer, 0.08);
    const bob = this.float ? Math.sin(t * 1.3) * 0.06 : 0;
    const sway = this.float ? Math.sin(t * 0.6) * 0.07 : 0;
    const jitter = this.shake ? Math.sin(t * 60) * 0.025 : 0;
    this.rig.rotation.y = this.yaw + sway + this.tilt.x * 0.25;
    this.rig.rotation.x = this.tilt.y * 0.08;
    this.chest.position.y = 0.06 + bob + (this.shake ? Math.abs(Math.sin(t * 40)) * 0.02 : 0);
    this.chest.rotation.z = jitter;

    // A lid that swings to 108 degrees, easing at the end of its travel.
    this.hinge.rotation.x = -open * 1.88;
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
