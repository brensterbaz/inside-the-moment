import * as THREE from "three";
import { Stadium, views, type View } from "./stadium";
export type XRState = {
  time: number;
  playing: boolean;
  selected: string;
  pending: boolean;
  answer: string;
};
type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: string;
};
export class XRExperience {
  private panel: THREE.Mesh;
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private controllers: THREE.Group[] = [];
  private ray = new THREE.Raycaster();
  private rotation = new THREE.Matrix4();
  private saved: View = views.stand;
  private buttons: Button[] = [];
  private lastPaint = -1;
  private fade: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private busy = false;
  private placementFrames = 0;
  supported = false;
  constructor(
    private stage: Stadium,
    private action: (id: string, value?: number) => void,
    private state: () => XRState,
    private notify: (s: string) => void,
  ) {
    this.canvas.width = 1200;
    this.canvas.height = 680;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.68),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.panel.visible = false;
    this.panel.renderOrder = 100;
    stage.scene.add(this.panel);
    this.fade = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0,
        depthTest: false,
      }),
    );
    this.fade.renderOrder = 1000;
    this.fade.visible = false;
    stage.camera.add(this.fade);
    for (let i = 0; i < 2; i++) {
      const controller = stage.renderer.xr.getController(i);
      const rayLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -1),
        ]),
        new THREE.LineBasicMaterial({
          color: 0xd1fa8b,
          transparent: true,
          opacity: 0.7,
        }),
      );
      rayLine.scale.z = 8;
      controller.add(rayLine);
      controller.addEventListener("selectstart", () => this.select(controller));
      controller.addEventListener("squeezestart", () => {
        this.panel.visible = !this.panel.visible;
        if (this.panel.visible) this.placePanel();
      });
      stage.rig.add(controller);
      this.controllers.push(controller);
    }
    stage.renderer.xr.addEventListener("sessionstart", () => {
      this.saved = stage.snapshot();
      stage.controls.enabled = false;
      stage.camera.position.set(0, 0, 0);
      stage.camera.rotation.set(0, 0, 0);
      stage.rig.position.set(32, 18, 43);
      stage.rig.rotation.set(0, 0.15, 0);
      this.panel.visible = true;
      this.lastPaint = -1;
      this.placementFrames = 2;
      this.notify(
        "VR session active. Trigger selects; grip summons the control panel.",
      );
    });
    stage.renderer.xr.addEventListener("sessionend", () => {
      stage.rig.position.set(0, 0, 0);
      stage.rig.rotation.set(0, 0, 0);
      stage.setView(this.saved);
      stage.controls.enabled = true;
      this.panel.visible = false;
      this.fade.visible = false;
      this.notify("Returned to desktop.");
    });
  }
  async detect() {
    try {
      this.supported =
        !!navigator.xr &&
        (await navigator.xr.isSessionSupported("immersive-vr"));
    } catch {
      this.supported = false;
    }
    return this.supported;
  }
  async enter() {
    try {
      const current = this.stage.renderer.xr.getSession();
      if (current) {
        await current.end();
        return;
      }
      if (!navigator.xr || !this.supported) {
        this.notify(
          "VR needs a compatible headset browser on a secure origin. Desktop controls are ready.",
        );
        return;
      }
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"],
      });
      try {
        await this.stage.renderer.xr.setSession(session);
      } catch (error) {
        await session.end();
        throw error;
      }
    } catch {
      this.notify(
        "VR could not start. Check headset connection, browser permissions and a secure URL.",
      );
    }
  }
  snapshot(): View {
    const pos = this.stage.rig.position;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.stage.rig.quaternion,
    );
    return {
      name: "Previous VR view",
      position: [pos.x, pos.y + 1.7, pos.z],
      target: [pos.x + dir.x * 10, pos.y + 1.7, pos.z + dir.z * 10],
    };
  }
  teleport(view: View) {
    if (this.busy) return;
    this.busy = true;
    this.fade.visible = true;
    this.fade.material.opacity = 1;
    setTimeout(() => {
      const [x, y, z] = view.position;
      this.stage.rig.position.set(x, Math.max(0, y - 1.7), z);
      this.stage.rig.rotation.y = Math.atan2(
        x - view.target[0],
        z - view.target[2],
      );
      this.placementFrames = 2;
      setTimeout(() => {
        this.fade.visible = false;
        this.busy = false;
      }, 100);
    }, 100);
  }
  private placePanel() {
    const camera = this.stage.renderer.xr.getCamera();
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3();
    camera.getWorldPosition(position);
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    this.panel.position.copy(position).addScaledVector(direction, 1.5);
    this.panel.position.y -= 0.5;
    this.panel.lookAt(position);
  }
  private select(controller: THREE.Group) {
    this.rotation.extractRotation(controller.matrixWorld);
    this.ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.ray.ray.direction.set(0, 0, -1).applyMatrix4(this.rotation);
    const hit = this.panel.visible
      ? this.ray.intersectObject(this.panel)[0]
      : undefined;
    if (hit?.uv) {
      const x = hit.uv.x * 1200,
        y = (1 - hit.uv.y) * 680;
      if (y >= 120 && y <= 175 && x >= 40 && x <= 1160) {
        this.action("seek", ((x - 40) / 1120) * 30);
        return;
      }
      const b = this.buttons.find(
        (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h,
      );
      if (b) this.action(b.action);
      return;
    }
    const playerHit = this.ray.intersectObjects(this.stage.pickables, true)[0];
    if (playerHit) {
      let o: THREE.Object3D | null = playerHit.object;
      while (o && !o.userData.playerId) o = o.parent;
      if (o) this.stage.onSelect(o.userData.playerId);
      return;
    }
    const ground = this.ray.intersectObject(this.stage.pitch)[0];
    if (ground) {
      this.stage.onPoint({ x: ground.point.x, z: ground.point.z });
      this.panel.visible = true;
      this.placePanel();
    }
  }
  update(now: number) {
    if (!this.stage.renderer.xr.isPresenting) return;
    if (this.placementFrames > 0) {
      this.placementFrames--;
      if (this.placementFrames === 0) this.placePanel();
    }
    if (now - this.lastPaint < 100) return;
    this.lastPaint = now;
    const s = this.state(),
      c = this.ctx;
    c.clearRect(0, 0, 1200, 680);
    c.fillStyle = "#101d24";
    c.fillRect(0, 0, 1200, 680);
    c.strokeStyle = "#496153";
    c.lineWidth = 3;
    c.strokeRect(1, 1, 1198, 678);
    c.font = "bold 30px sans-serif";
    c.fillStyle = "#d1f893";
    c.fillText("INSIDE THE MOMENT", 40, 50);
    c.font = "22px sans-serif";
    c.fillStyle = "#a8bbb8";
    c.fillText(
      `LOCAL DEMO · scripted analyst     ${s.time.toFixed(1)} / 30.0s`,
      40,
      88,
    );
    c.fillStyle = "#3a4c4b";
    c.fillRect(40, 137, 1120, 9);
    c.fillStyle = "#c8f789";
    c.fillRect(40, 137, (1120 * s.time) / 30, 9);
    c.beginPath();
    c.arc(40 + (1120 * s.time) / 30, 141, 12, 0, Math.PI * 2);
    c.fill();
    this.buttons = [
      {
        x: 40,
        y: 195,
        w: 200,
        h: 62,
        label: s.playing ? "Freeze" : "Play",
        action: "toggle",
      },
      { x: 260, y: 195, w: 200, h: 62, label: "Back 3s", action: "back" },
      { x: 480, y: 195, w: 200, h: 62, label: "Before pass", action: "before" },
      { x: 700, y: 195, w: 200, h: 62, label: "Explain", action: "explain" },
      {
        x: 920,
        y: 195,
        w: 240,
        h: 62,
        label: "Return to seat",
        action: "seat",
      },
      {
        x: 40,
        y: 280,
        w: 250,
        h: 62,
        label: s.pending ? "Confirm move" : "Point at pitch",
        action: s.pending ? "confirm" : "hint",
      },
      { x: 310, y: 280, w: 200, h: 62, label: "Cancel", action: "cancel" },
      { x: 530, y: 280, w: 200, h: 62, label: "Undo move", action: "undo" },
      { x: 750, y: 280, w: 200, h: 62, label: "Clear & play", action: "clear" },
      { x: 970, y: 280, w: 190, h: 62, label: "Exit VR", action: "exit" },
    ];
    for (const b of this.buttons) {
      c.fillStyle = b.action === "confirm" ? "#c8f789" : "#2b3d42";
      c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = b.action === "confirm" ? "#10221b" : "#e9efe8";
      c.font = "24px sans-serif";
      c.fillText(b.label, b.x + 15, b.y + 40);
    }
    c.fillStyle = "#d9e3dc";
    c.font = "24px sans-serif";
    c.fillText(`SELECTED  ${s.selected}`, 40, 391);
    const text =
      s.answer ||
      "Point at a player to select. Point at the pitch to preview a move, then confirm. Grip brings the control panel to you.";
    const words = text.split(" ");
    let line = "",
      y = 440;
    c.font = "24px sans-serif";
    c.fillStyle = "#b6c7c2";
    for (const word of words) {
      if (c.measureText(line + word).width > 1100) {
        c.fillText(line, 40, y);
        line = "";
        y += 34;
        if (y > 620) break;
      }
      line += word + " ";
    }
    if (y <= 620) c.fillText(line, 40, y);
    this.texture.needsUpdate = true;
  }
}
