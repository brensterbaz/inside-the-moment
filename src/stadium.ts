import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { players, type Point } from "./match";
import { playerAt, playerSpeed, ballAt } from "./replay";

export type View = {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
};
export const views: Record<string, View> = {
  stand: { name: "The stand", position: [43, 34, 64], target: [13, 0, -2] },
  dugout: { name: "The dugout", position: [17, 2.4, 37], target: [34, 1, -5] },
  pitch: { name: "On the pitch", position: [28, 1.7, 12], target: [42, 1, -3] },
  keeper: {
    name: "Keeper’s view",
    position: [50, 1.7, 0],
    target: [28, 1, -6],
  },
};
type Figure = {
  group: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  ring: THREE.Mesh;
};
const vector = (p: Point, y = 0) => new THREE.Vector3(p.x, y, p.z);

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export class Stadium {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(47, 1, 0.1, 350);
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  rig = new THREE.Group();
  pitch!: THREE.Mesh;
  figures = new Map<string, Figure>();
  pickables: THREE.Object3D[] = [];
  ball: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  marker: THREE.Group;
  analysis = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private resizeObserver: ResizeObserver;
  private down = { x: 0, y: 0 };
  selected = "h9";
  moveMode = false;
  onSelect: (id: string) => void = () => {};
  onPoint: (point: Point) => void = () => {};
  constructor(public host: HTMLElement) {
    this.scene.background = new THREE.Color("#152431");
    this.scene.fog = new THREE.Fog("#152431", 100, 230);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setFoveation(1);
    this.renderer.xr.setFramebufferScaleFactor(1);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D football replay. Drag to orbit; click a player to select.",
    );
    this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.scene.add(this.rig);
    this.rig.add(this.camera);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 125;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.025;
    this.controls.minTargetRadius = 0;
    this.controls.maxTargetRadius = 60;
    this.scene.add(new THREE.HemisphereLight("#b8dcee", "#173724", 2.1));
    const sun = new THREE.DirectionalLight("#ffffff", 2.5);
    sun.position.set(-35, 70, 20);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight("#99bfff", 1.4);
    rim.position.set(60, 30, -60);
    this.scene.add(rim);
    this.buildStadium();
    this.buildPlayers();
    this.buildAnalysis();
    this.ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.29, 1),
      new THREE.MeshStandardMaterial({ color: "#fff9da", roughness: 0.55 }),
    );
    const seam = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.ball.geometry),
      new THREE.LineBasicMaterial({ color: "#283333" }),
    );
    this.ball.add(seam);
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 16),
      new THREE.MeshBasicMaterial({
        color: 0x07170f,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.85, 40),
      new THREE.MeshBasicMaterial({
        color: "#d2ff80",
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    this.marker.add(ring);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.8, 6),
      new THREE.MeshBasicMaterial({ color: "#d2ff80" }),
    );
    post.position.y = 0.9;
    this.marker.add(post);
    this.marker.visible = false;
    this.scene.add(this.marker);
    this.setView(views.stand);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      this.down = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5)
        return;
      const r = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        this.camera,
      );
      this.pick(this.raycaster);
    });
  }
  private mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = this.scene,
  ) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  private buildStadium() {
    const pitchTexture = canvasTexture(1536, 1024, (c) => {
      c.fillStyle = "#276949";
      c.fillRect(0, 0, 1536, 1024);
      for (let i = 0; i < 14; i++) {
        c.fillStyle = i % 2 ? "#286c4b" : "#306f4e";
        c.fillRect((i * 1536) / 14, 0, 1536 / 14, 1024);
      }
      c.save();
      c.scale(1536 / 105, 1024 / 68);
      c.strokeStyle = "rgba(232,243,211,.78)";
      c.lineWidth = 0.13;
      c.strokeRect(0.2, 0.2, 104.6, 67.6);
      c.beginPath();
      c.moveTo(52.5, 0);
      c.lineTo(52.5, 68);
      c.stroke();
      c.beginPath();
      c.arc(52.5, 34, 9.15, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#e8f3d3";
      for (const x of [11, 52.5, 94]) {
        c.beginPath();
        c.arc(x, 34, 0.2, 0, Math.PI * 2);
        c.fill();
      }
      for (const right of [false, true]) {
        const x = right ? 105 - 16.5 : 0;
        c.strokeRect(x, 34 - 20.16, 16.5, 40.32);
        c.strokeRect(right ? 99.5 : 0, 34 - 9.16, 5.5, 18.32);
        c.beginPath();
        c.arc(
          right ? 94 : 11,
          34,
          9.15,
          right ? Math.PI - 0.93 : -0.93,
          right ? Math.PI + 0.93 : 0.93,
        );
        c.stroke();
      }
      c.restore();
    });
    pitchTexture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const ground = this.mesh(
      new THREE.PlaneGeometry(145, 110),
      new THREE.MeshStandardMaterial({ color: "#1c3b32", roughness: 1 }),
      0,
      -0.03,
      0,
    );
    ground.rotation.x = -Math.PI / 2;
    this.pitch = this.mesh(
      new THREE.PlaneGeometry(105, 68),
      new THREE.MeshStandardMaterial({ map: pitchTexture, roughness: 1 }),
      0,
      0,
      0,
    );
    this.pitch.rotation.x = -Math.PI / 2;
    const concrete = new THREE.MeshStandardMaterial({
      color: "#293a43",
      roughness: 0.95,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: "#344955",
      roughness: 0.8,
      metalness: 0.25,
    });
    for (const side of [-1, 1]) {
      for (let row = 0; row < 7; row++) {
        this.mesh(
          new THREE.BoxGeometry(128, 1.05, 2.2),
          concrete,
          0,
          row * 1.5 + 0.6,
          side * (40 + row * 2.2),
        );
        this.mesh(
          new THREE.BoxGeometry(2.2, 1.05, 76),
          concrete,
          side * (58 + row * 2.2),
          row * 1.5 + 0.6,
          0,
        );
      }
      // Keep the near touchline open so the default spectator camera is not occluded.
      if (side === -1)
        this.mesh(
          new THREE.BoxGeometry(136, 0.6, 12),
          roofMat,
          0,
          16,
          side * 52,
        );
      this.mesh(new THREE.BoxGeometry(10, 0.6, 86), roofMat, side * 70, 15, 0);
      for (const x of [-59, -30, 0, 30, 59])
        this.mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 16, 6),
          concrete,
          x,
          8,
          side * 55,
        );
    }
    const seatGeometry = new THREE.BoxGeometry(0.65, 0.35, 0.65);
    const seatMesh = new THREE.InstancedMesh(
      seatGeometry,
      new THREE.MeshStandardMaterial({ color: "#547180", roughness: 0.9 }),
      2400,
    );
    const dummy = new THREE.Object3D();
    let seat = 0;
    for (const side of [-1, 1])
      for (let row = 0; row < 7; row++) {
        for (let x = -61; x <= 61; x += 1.2) {
          dummy.position.set(x, row * 1.5 + 1.4, side * (40 + row * 2.2));
          dummy.updateMatrix();
          seatMesh.setMatrixAt(seat, dummy.matrix);
          seatMesh.setColorAt(
            seat++,
            new THREE.Color(
              Math.floor(x + row * 3) % 5 === 0 ? "#7997a4" : "#3c5968",
            ),
          );
        }
        for (let z = -36; z <= 36; z += 1.2) {
          dummy.position.set(side * (58 + row * 2.2), row * 1.5 + 1.4, z);
          dummy.updateMatrix();
          seatMesh.setMatrixAt(seat, dummy.matrix);
          seatMesh.setColorAt(
            seat++,
            new THREE.Color(row % 3 ? "#405f6f" : "#7997a4"),
          );
        }
      }
    seatMesh.count = seat;
    seatMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(seatMesh);
    const boardTexture = canvasTexture(2048, 128, (c) => {
      c.fillStyle = "#102c2c";
      c.fillRect(0, 0, 2048, 128);
      c.fillStyle = "#c3ef88";
      c.font = "bold 40px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (let i = 0; i < 4; i++)
        c.fillText(
          i % 2 ? "INSIDE THE MOMENT" : "NORTHBANK FC",
          256 + i * 512,
          64,
        );
    });
    const boardMat = new THREE.MeshBasicMaterial({
      map: boardTexture,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const board = this.mesh(
        new THREE.PlaneGeometry(110, 1.3),
        boardMat,
        0,
        0.9,
        side * 36,
      );
      if (side === 1) board.rotation.y = Math.PI;
    }
    for (const x of [-57, 57])
      for (const z of [-41, 41]) {
        this.mesh(
          new THREE.CylinderGeometry(0.18, 0.3, 26, 8),
          concrete,
          x,
          13,
          z,
        );
        const lights = this.mesh(
          new THREE.BoxGeometry(5, 1.5, 0.3),
          new THREE.MeshBasicMaterial({ color: "#e1f3ff" }),
          x,
          26,
          z,
        );
        lights.lookAt(0, 0, 0);
      }
    for (const side of [-1, 1]) this.buildGoal(side);
    // Corner flags and original dugouts.
    const flagMat = new THREE.MeshBasicMaterial({ color: "#c4f280" });
    for (const x of [-52.5, 52.5])
      for (const z of [-34, 34]) {
        this.mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5),
          concrete,
          x,
          0.75,
          z,
        );
        this.mesh(
          new THREE.PlaneGeometry(0.5, 0.35),
          flagMat,
          x + 0.25,
          1.25,
          z,
        );
      }
    for (const x of [-10, 10])
      this.mesh(
        new THREE.BoxGeometry(8, 2.2, 2.5),
        new THREE.MeshStandardMaterial({
          color: "#1e303e",
          transparent: true,
          opacity: 0.85,
        }),
        x,
        1.1,
        39,
      );
  }
  private buildGoal(side: number) {
    const material = new THREE.MeshStandardMaterial({
      color: "#f1f2e8",
      roughness: 0.4,
    });
    for (const z of [-3.66, 3.66])
      this.mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.44, 8),
        material,
        side * 52.5,
        1.22,
        z,
      );
    const bar = this.mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 7.32, 8),
      material,
      side * 52.5,
      2.44,
      0,
    );
    bar.rotation.x = Math.PI / 2;
    const points: THREE.Vector3[] = [];
    for (let z = -3.66; z <= 3.66; z += 0.37) {
      points.push(
        new THREE.Vector3(side * 54.5, 0, z),
        new THREE.Vector3(side * 54.5, 2.44, z),
        new THREE.Vector3(side * 54.5, 2.44, z),
        new THREE.Vector3(side * 52.5, 2.44, z),
      );
    }
    for (let y = 0; y <= 2.44; y += 0.3) {
      points.push(
        new THREE.Vector3(side * 54.5, y, -3.66),
        new THREE.Vector3(side * 54.5, y, 3.66),
      );
      for (const z of [-3.66, 3.66])
        points.push(
          new THREE.Vector3(side * 52.5, y, z),
          new THREE.Vector3(side * 54.5, y, z),
        );
    }
    this.scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: "#cad7d7",
          transparent: true,
          opacity: 0.35,
        }),
      ),
    );
  }
  private buildPlayers() {
    const headGeometry = new THREE.SphereGeometry(0.17, 10, 8);
    const bodyGeometry = new THREE.CylinderGeometry(0.24, 0.2, 0.58, 7);
    const skin = new THREE.MeshStandardMaterial({
      color: "#c89373",
      roughness: 1,
    });
    const shorts = new THREE.MeshStandardMaterial({
      color: "#162e32",
      roughness: 1,
    });
    const boot = new THREE.MeshStandardMaterial({
      color: "#eee8d2",
      roughness: 0.7,
    });
    const contactMaterial = new THREE.MeshBasicMaterial({
      color: "#091c16",
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    for (const p of players) {
      const group = new THREE.Group();
      group.userData.playerId = p.id;
      const color =
        p.role === "Goalkeeper"
          ? "#d9b64c"
          : p.team === "home"
            ? "#bbf480"
            : "#ee976e";
      const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      this.mesh(bodyGeometry, shirt, 0, 1.1, 0, group);
      this.mesh(headGeometry, skin, 0, 1.59, 0, group);
      this.mesh(
        new THREE.BoxGeometry(0.42, 0.25, 0.29),
        shorts,
        0,
        0.75,
        0,
        group,
      );
      const legs: THREE.Group[] = [],
        arms: THREE.Group[] = [];
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.13, 0.7, 0);
        this.mesh(
          new THREE.CylinderGeometry(0.075, 0.06, 0.54, 6),
          shirt,
          0,
          -0.27,
          0,
          leg,
        );
        this.mesh(
          new THREE.BoxGeometry(0.15, 0.12, 0.29),
          boot,
          0,
          -0.61,
          0.055,
          leg,
        );
        group.add(leg);
        legs.push(leg);
        const arm = new THREE.Group();
        arm.position.set(side * 0.3, 1.3, 0);
        this.mesh(
          new THREE.CylinderGeometry(0.065, 0.055, 0.5, 6),
          skin,
          0,
          -0.25,
          0,
          arm,
        );
        group.add(arm);
        arms.push(arm);
      }
      const shadow = this.mesh(
        new THREE.CircleGeometry(0.5, 16),
        contactMaterial,
        0,
        0.015,
        0,
        group,
      );
      shadow.rotation.x = -Math.PI / 2;
      const ring = this.mesh(
        new THREE.RingGeometry(0.65, 0.76, 32),
        new THREE.MeshBasicMaterial({
          color: "#e4ff99",
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
        0,
        0.025,
        0,
        group,
      );
      ring.rotation.x = -Math.PI / 2;
      const texture = canvasTexture(96, 96, (c) => {
        c.fillStyle = p.team === "home" ? "#d3f99a" : "#ffbd9b";
        c.beginPath();
        c.arc(48, 48, 38, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#142223";
        c.font = "bold 40px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(p.number), 48, 50);
      });
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
        }),
      );
      label.position.y = 2.4;
      label.scale.set(1.25, 1.25, 1);
      group.add(label);
      this.scene.add(group);
      this.figures.set(p.id, { group, legs, arms, ring });
      this.pickables.push(group);
    }
  }
  private buildAnalysis() {
    const points = [];
    for (let t = 14; t <= 24; t += 0.25)
      points.push(vector(playerAt("h9", t), 0.09));
    const run = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({
        color: "#d7fa88",
        dashSize: 0.65,
        gapSize: 0.35,
      }),
    );
    run.computeLineDistances();
    this.analysis.add(run);
    const a = vector(playerAt("h7", 21.5), 0.08),
      b = vector(playerAt("h9", 23), 0.08);
    const dir = new THREE.Vector3().subVectors(b, a);
    this.analysis.add(
      new THREE.ArrowHelper(
        dir.clone().normalize(),
        a,
        dir.length(),
        0xd7fa88,
        1.3,
        0.6,
      ),
    );
    this.analysis.visible = false;
    this.scene.add(this.analysis);
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  setView(view: View) {
    this.camera.position.fromArray(view.position);
    this.controls.target.fromArray(view.target);
    this.controls.update();
  }
  snapshot(name = "Previous view"): View {
    return {
      name,
      position: this.camera.position.toArray() as View["position"],
      target: this.controls.target.toArray() as View["target"],
    };
  }
  preview(point: Point | null) {
    this.marker.visible = !!point;
    if (point) this.marker.position.set(point.x, 0, point.z);
  }
  pick(ray: THREE.Raycaster) {
    if (this.moveMode) {
      const hit = ray.intersectObject(this.pitch)[0];
      if (hit) this.onPoint({ x: hit.point.x, z: hit.point.z });
      return;
    }
    const hit = ray.intersectObjects(this.pickables, true)[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.playerId) o = o.parent;
      if (o) this.onSelect(o.userData.playerId);
    }
  }
  update(time: number, delta: number) {
    for (const p of players) {
      const f = this.figures.get(p.id)!,
        point = playerAt(p.id, time),
        next = playerAt(p.id, Math.min(30, time + 0.1));
      f.group.position.set(point.x, 0, point.z);
      if (Math.hypot(next.x - point.x, next.z - point.z) > 0.001)
        f.group.rotation.y = Math.atan2(next.x - point.x, next.z - point.z);
      const stride =
        Math.sin(time * 9 + p.number) *
        Math.min(playerSpeed(p.id, time) / 22, 1) *
        0.7;
      f.legs[0].rotation.x = stride;
      f.legs[1].rotation.x = -stride;
      f.arms[0].rotation.x = -stride * 0.7;
      f.arms[1].rotation.x = stride * 0.7;
      f.ring.visible = p.id === this.selected;
    }
    const b = ballAt(time);
    this.ball.position.set(b.x, b.y, b.z);
    this.ball.rotation.set(time * 4, 0, time * 6);
    this.ballShadow.position.set(b.x, 0.018, b.z);
    this.ballShadow.scale.setScalar(1 + b.y * 0.2);
    if (!this.renderer.xr.isPresenting) this.controls.update(delta);
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
