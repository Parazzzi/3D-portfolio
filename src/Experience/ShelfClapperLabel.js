import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import Experience from "./Experience.js";

const CLAPPER_TRANSLATION = new Vector3(
  3.1273255348205566,
  4.605562686920166,
  -4.147308826446533
);
const CLAPPER_ROTATION = new Quaternion(
  -0.07059667259454727,
  -0.003460580250248313,
  0.0019413818372413516,
  0.9974971413612366
);
const CLAPPER_BODY_CENTER = new Vector3(0.1298816, -0.0981706, -0.0143384);
const CLAPPER_FRONT_CENTER = new Vector3(0.1298816, -0.0981706, 0.026);

export default class ShelfClapperLabel {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.setLabel();
  }

  createTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 896;

    const context = canvas.getContext("2d");
    context.fillStyle = "#050505";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#f3f0e6";
    const stripeWidth = 112;
    for (let x = -80; x < canvas.width + stripeWidth; x += stripeWidth * 2) {
      context.save();
      context.translate(x, 28);
      context.rotate(-0.65);
      context.fillRect(0, 0, 96, 200);
      context.restore();
    }

    context.fillStyle = "#101010";
    context.fillRect(0, 180, canvas.width, canvas.height - 180);
    context.strokeStyle = "#f3f0e6";
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(90, 420);
    context.lineTo(934, 420);
    context.moveTo(90, 574);
    context.lineTo(934, 574);
    context.stroke();

    context.textAlign = "center";
    context.fillStyle = "#f3f0e6";
    context.font = "72px Arial";
    context.fillText("Dementiy Besarab", canvas.width / 2, 354);
    context.font = "88px Arial";
    context.fillText("Unity Portfolio", canvas.width / 2, 548);
    context.font = "52px Arial";
    context.fillText("C# 2D 3D VR/XR", canvas.width / 2, 700);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    return texture;
  }

  setLabel() {
    this.group = new Group();
    this.group.name = "dementiyShelfClapperLabel";
    this.group.position.copy(CLAPPER_TRANSLATION);
    this.group.quaternion.copy(CLAPPER_ROTATION);

    const bodyGeometry = new BoxGeometry(0.68, 0.6, 0.035);
    const bodyMaterial = new MeshBasicMaterial({
      color: "#050505",
      toneMapped: false,
    });
    const body = new Mesh(bodyGeometry, bodyMaterial);
    body.position.copy(CLAPPER_BODY_CENTER);
    this.group.add(body);

    const geometry = new PlaneGeometry(0.66, 0.58);
    const material = new MeshBasicMaterial({
      map: this.createTexture(),
      side: DoubleSide,
      toneMapped: false,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.name = "dementiyShelfClapperLabelFace";
    this.mesh.position.copy(CLAPPER_FRONT_CENTER);
    this.mesh.renderOrder = 10;
    this.group.add(this.mesh);

    this.scene.add(this.group);
  }
}
