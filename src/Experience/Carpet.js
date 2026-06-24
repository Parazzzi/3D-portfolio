import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

import Experience from "./Experience.js";
import { RUG_POSITION, RUG_ROTATION, RUG_SIZE } from "./constants.js";

export default class Carpet {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.renderer = this.experience.renderer.instance;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.setCarpet();
  }

  setCarpet() {
    const texture = this.resources.items.persianRugTexture;
    texture.anisotropy = this.maxAnisotropy;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    const geometry = new PlaneGeometry(RUG_SIZE.x, RUG_SIZE.y);
    const material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
    });

    this.carpet = new Mesh(geometry, material);
    this.carpet.name = "PersianRug";
    this.carpet.rotation.copy(RUG_ROTATION);
    this.carpet.position.copy(RUG_POSITION);
    this.carpet.renderOrder = 2;
    this.carpet.receiveShadow = true;

    this.scene.add(this.carpet);
  }
}
