import * as THREE from "three";
import { FACES } from "../config/faces.js";
import { createHatchTexture } from "../materials/procedural-textures.js";
import { createSlopeMaterial } from "../materials/slope-material.js";
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
 * 顶点顺序（与 faces.js verts 一致）：v0 底左 → v1 底右 → v2 顶右 → v3 顶左（y≈0 为底，覆斗顶底窄顶宽）。
 * 几何 UV：标准四边形 [0,1]–[1,1]–[1,0]–[0,0]（v=1 底、v=0 顶）；透明梯形由 PNG alpha 裁切，shader 不做 cover 裁剪。
 * PNG：梯形主体不透明，外侧透明；画布可为矩形，实际可见区为下窄上宽的梯形。
 *
 * north（北坡，+Z 侧，Gatehouse）
 *   方向：下边短、上边长；左对齐 v0–v3，右对齐 v1–v2。
 *   边长比 底:顶 ≈ 1.10:4.70，平均坡面宽高比 planeAspect ≈ 0.75。
 *   建议贴图：透明区在四角；梯形下缘短、上缘长，整体比例接近 3:4 竖幅。
 *
 * south（南坡，Volunteer）
 *   方向：与 north 相同（下窄上宽），沿 -Z 展开。
 *   边长比 底:顶 ≈ 1.10:4.70，planeAspect ≈ 0.75。
 *
 * west（西坡，Dunhuang）
 *   方向：下边短（近 -X 藻井口）、上边长；沿 Z 方向展宽。
 *   边长比 底:顶 ≈ 1.10:4.10，planeAspect ≈ 0.80。
 *   建议贴图：梯形短边在下（近藻井）、长边在上。
 *
 * east（东坡，Folk rhyme）
 *   方向：与 west 镜像（下窄上宽），沿 Z 展宽。
 *   边长比 底:顶 ≈ 1.10:4.10，planeAspect ≈ 0.80。
 *
 * 替换后刷新页面即可（texture v=5 cache bust）；保持 PNG alpha 通道。
 */

function logSlopeProfileGuide(face, metrics) {
  const { bottomW, topW, leftH, rightH, planeAspect } = metrics;
  const ratio = (bottomW / topW).toFixed(2);
  console.info(
    `[monument] ${face.id} profile.png — bottom:top width ${bottomW.toFixed(2)}:${topW.toFixed(2)} (${ratio}), ` +
      `left:right height ${leftH.toFixed(2)}:${rightH.toFixed(2)}, planeAspect≈${planeAspect.toFixed(2)}`
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

    const mat = createSlopeMaterial(new THREE.Texture(), hatch);
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
