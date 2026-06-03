import * as THREE from "three";
import { FACES } from "../config/faces.js";
import { createHatchTexture } from "../materials/procedural-textures.js";
import {
  createSlopeMaterial,
  SLOPE_EDGE_BLEED,
  SLOPE_EDGE_BLEED_EAST,
  SLOPE_EDGE_BLEED_SIDE,
} from "../materials/slope-material.js";
import { createSlopeGeometry } from "../geometry/slope-geometry.js";
import { buildBlueprint } from "../builders/blueprint.js";
import { buildZaojing } from "../builders/zaojing.js";
import {
  createProjectTextureLoader,
  configureSlopeProfileTexture,
  loadProjectTexture,
} from "./texture-loader.js";

/**
 * 各坡面 profile.png（透明底梯形）替换指南
 * ─────────────────────────────────────
 * 坡面视觉：上窄下宽（窄边靠藻井 y=0，宽边在外缘 y=3.1）。
 * 顶点：v0 窄左 → v1 窄右 → v2 宽右 → v3 宽左。
 * UV（配合默认 flipY）：贴图顶行 u∈[m,1−m] 对齐窄边；底行 u∈[0,1] 对齐宽边。
 *   m = (1 − 窄边宽/宽边宽) / 2，见控制台 [monument] 日志。
 * PNG：上窄下宽；顶边不透明段水平居中、宽度 ≈ (窄/宽)×画布宽；底边满画布宽；
 *   四角为不透明梯形顶点，顶角在 (m·W,0) 与 ((1−m)·W,0)，底角在 (0,H) 与 (W,H)。
 *
 * north/south 窄:宽 ≈ 1.10:4.70（m≈0.38）| west 窄:宽 ≈ 1.10:6.24（m≈0.41）| east ≈ 1.10:4.10（m≈0.37）
 *
 * 替换后刷新；保持 PNG alpha。texture cache bust 见 texture-loader.js。
 */

function logSlopeProfileGuide(face, metrics) {
  const { bottomW, topW, leftH, rightH, planeAspect } = metrics;
  const ratio = (bottomW / topW).toFixed(2);
  const m = ((1 - bottomW / topW) * 0.5).toFixed(3);
  console.info(
    `[monument] ${face.id} profile.png — narrow:wide ${bottomW.toFixed(2)}:${topW.toFixed(2)} (${ratio}), ` +
      `uvMargin m≈${m} (top opaque span ${((1 - 2 * parseFloat(m)) * 100).toFixed(0)}% width), ` +
      `planeAspect≈${planeAspect.toFixed(2)}`
  );
}

/** 纪念碑组：四坡面 + 文字 + 藻井 + 线稿 */
export function buildMonument(ctx) {
  const { scene } = ctx;

  const monument = new THREE.Group();
  monument.position.y = 0.2;
  scene.add(monument);

  const hatchN = createHatchTexture(0);
  const hatchE = createHatchTexture(90);
  const loader = createProjectTextureLoader();

  const slopeMeshes = [];
  const textMeshes = [];

  monument.rotation.x = Math.PI - 0.08;
  monument.scale.set(0.8064, 0.48384, 0.8064);
  monument.position.y = 2.65;

  ctx.monument = monument;
  ctx.slopeMeshes = slopeMeshes;
  ctx.textMeshes = textMeshes;

  FACES.forEach((face) => {
    const hatch = face.id === "west" || face.id === "east" ? hatchE : hatchN;
    const geo = createSlopeGeometry(face.verts);
    const metrics = geo.userData.edgeMetrics;
    logSlopeProfileGuide(face, metrics);

    const edgeBleed =
      face.id === "east"
        ? SLOPE_EDGE_BLEED_EAST
        : face.id === "west"
          ? SLOPE_EDGE_BLEED_SIDE
          : SLOPE_EDGE_BLEED;
    const mat = createSlopeMaterial(new THREE.Texture(), hatch, edgeBleed);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.faceId = face.id;
    mesh.userData.href = face.href;
    mesh.userData.face = face;
    monument.add(mesh);
    slopeMeshes.push(mesh);

    loadProjectTexture(loader, face.texture)
      .then((tex) => {
        configureSlopeProfileTexture(tex);
        mat.uniforms.uMap.value = tex;
        mat.needsUpdate = true;
      })
      .catch((err) => {
        console.error(`[monument] texture failed: ${face.texture}`, err);
        const fallback = new THREE.CanvasTexture(document.createElement("canvas"));
        mat.uniforms.uMap.value = fallback;
      });
  });

  const zaojingGroup = buildZaojing(monument);
  const blueprintGroup = buildBlueprint(monument);

  ctx.blueprintGroup = blueprintGroup;
  ctx.zaojingGroup = zaojingGroup;

  return { monument, slopeMeshes, textMeshes, blueprintGroup, zaojingGroup };
}
