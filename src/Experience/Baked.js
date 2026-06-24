import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";
import Experience from "./Experience.js";
import {
  DESK_UNDERGLOW_PLANES,
  ROOM_PALETTE,
} from "./constants.js";

export default class Baked {
  constructor() {
    this.experience = new Experience();
    this.resources = this.experience.resources;
    this.scene = this.experience.scene;
    this.renderer = this.experience.renderer.instance;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.setModels();
  }

  setMaterial = (object, material) => {
    object.traverse((child) => {
      if (child.isMesh) {
        child.material = material;
      }
    });
  };

  configureTexture = (texture) => {
    texture.anisotropy = this.maxAnisotropy;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  createBakedMaterial = (texture) => {
    const material = new MeshBasicMaterial({
      map: texture,
    });

    this.applyRoomPaletteShader(material);

    return material;
  };

  applyRoomPaletteShader = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWallColor = { value: ROOM_PALETTE.wallColor };
      shader.uniforms.uPoufColor = { value: ROOM_PALETTE.poufColor };
      shader.uniforms.uUnderglowColor = { value: ROOM_PALETTE.underglowColor };

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vPaletteWorldPosition;`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vPaletteWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec3 uWallColor;
uniform vec3 uPoufColor;
uniform vec3 uUnderglowColor;
varying vec3 vPaletteWorldPosition;

float paletteRangeMask(float value, float minValue, float maxValue, float feather) {
  return smoothstep(minValue, minValue + feather, value) *
    (1.0 - smoothstep(maxValue - feather, maxValue, value));
}

float paletteBoxMask(vec3 position, vec3 minBounds, vec3 maxBounds, float feather) {
  return paletteRangeMask(position.x, minBounds.x, maxBounds.x, feather) *
    paletteRangeMask(position.y, minBounds.y, maxBounds.y, feather) *
    paletteRangeMask(position.z, minBounds.z, maxBounds.z, feather);
}

float blueSurfaceMask(vec3 color) {
  float blueLead = color.b - max(color.r, color.g);
  float saturation = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
  return smoothstep(0.025, 0.16, blueLead) * smoothstep(0.055, 0.22, saturation);
}

float warmWallMask(vec3 color) {
  float maxChannel = max(color.r, max(color.g, color.b));
  float minChannel = min(color.r, min(color.g, color.b));
  float saturation = maxChannel - minChannel;
  float warm = smoothstep(0.015, 0.12, color.r - color.b) *
    smoothstep(-0.015, 0.09, color.g - color.b);
  float muted = 1.0 - smoothstep(0.16, 0.36, saturation);
  float visibleWallValue = smoothstep(0.12, 0.25, maxChannel) *
    (1.0 - smoothstep(0.84, 0.96, maxChannel));
  return warm * muted * visibleWallValue;
}`
        )
        .replace(
          "#include <dithering_fragment>",
          `float wallArea = smoothstep(0.85, 1.75, vPaletteWorldPosition.y);
float wallMask = warmWallMask(gl_FragColor.rgb) * wallArea;
gl_FragColor.rgb = mix(gl_FragColor.rgb, uWallColor, wallMask * 0.42);

float blueSurface = blueSurfaceMask(gl_FragColor.rgb);
float poufArea = paletteRangeMask(vPaletteWorldPosition.y, 0.0, 1.45, 0.35) *
  smoothstep(-0.25, 0.45, vPaletteWorldPosition.z);
float underDeskArea = paletteBoxMask(
  vPaletteWorldPosition,
  vec3(-0.85, 0.0, -4.45),
  vec3(3.85, 2.55, 0.15),
  0.55
);

gl_FragColor.rgb = mix(gl_FragColor.rgb, uUnderglowColor, blueSurface * underDeskArea * 0.95);
gl_FragColor.rgb = mix(gl_FragColor.rgb, uPoufColor, blueSurface * poufArea * 0.78);

#include <dithering_fragment>`
        );
    };

    material.customProgramCacheKey = () => "room-palette-accents-v1";
  };

  createGlowTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(128, 64, 4, 128, 64, 118);

    gradient.addColorStop(0, "rgba(255, 79, 175, 0.95)");
    gradient.addColorStop(0.32, "rgba(255, 79, 175, 0.48)");
    gradient.addColorStop(0.68, "rgba(255, 79, 175, 0.14)");
    gradient.addColorStop(1, "rgba(255, 79, 175, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;

    return texture;
  };

  setDeskUnderglow = () => {
    const texture = this.createGlowTexture();

    DESK_UNDERGLOW_PLANES.forEach((glow, index) => {
      const geometry = new PlaneGeometry(glow.size.x, glow.size.y);
      const material = new MeshBasicMaterial({
        map: texture,
        color: ROOM_PALETTE.underglowColor,
        transparent: true,
        opacity: glow.opacity,
        side: DoubleSide,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new Mesh(geometry, material);

      mesh.name = `DeskUnderglow_${index + 1}`;
      mesh.position.copy(glow.position);
      mesh.rotation.copy(glow.rotation);
      mesh.renderOrder = 3;

      this.scene.add(mesh);
    });
  };

  setModels = () => {
    this.model = {};
    this.model.room1 = this.resources.items._roomModel.scene;

    this.bakedTexture1 = this.configureTexture(this.resources.items.baked1);
    this.model.material = this.createBakedMaterial(this.bakedTexture1);

    this.model.room2 = this.resources.items._roomModel2.scene;
    this.bakedTexture2 = this.configureTexture(this.resources.items.baked2);

    this.model.material2 = this.createBakedMaterial(this.bakedTexture2);

    this.model.room3 = this.resources.items._roomModel3.scene;
    this.bakedTexture3 = this.configureTexture(this.resources.items.baked3);

    this.model.material3 = this.createBakedMaterial(this.bakedTexture3);

    this.model.linkedin = this.resources.items.linkedin.scene;
    this.model.linkedin.name = "linkedin";
    this.model.github = this.resources.items.github.scene;
    this.model.github.name = "github";
    this.model.itchio = this.resources.items.itchio.scene;
    this.model.itchio.name = "itchio";

    this.setMaterial(this.model.room1, this.model.material);
    this.setMaterial(this.model.room2, this.model.material2);
    this.setMaterial(this.model.room3, this.model.material3);
    this.setMaterial(this.model.linkedin, this.model.material3);
    this.setMaterial(this.model.github, this.model.material3);
    this.setMaterial(this.model.itchio, this.model.material3);

    const originalShelfClapper = this.model.room3.getObjectByName("Claqueta.002");
    if (originalShelfClapper) {
      originalShelfClapper.visible = false;
    }

    this.scene.add(this.model.room1);
    this.scene.add(this.model.room2);
    this.scene.add(this.model.room3);
    this.setDeskUnderglow();

    this.scene.add(this.model.linkedin);
    this.scene.add(this.model.github);
    this.scene.add(this.model.itchio);
  };
}
