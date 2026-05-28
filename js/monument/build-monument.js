import * as THREE from "three";
import { FACES } from "../config/faces.js";
import { createHatchTexture } from "../materials/procedural-textures.js";
import { createSlopeMaterial } from "../materials/slope-material.js";
import { createSlopeGeometry } from "../geometry/slope-geometry.js";
import { buildBlueprint } from "../builders/blueprint.js";
import { buildZaojing } from "../builders/zaojing.js";
import { createProjectTextureLoader, loadProjectTexture } from "./texture-loader.js";

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
    const mat = createSlopeMaterial(new THREE.Texture(), hatch);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.faceId = face.id;
    mesh.userData.href = face.href;
    mesh.userData.face = face;
    monument.add(mesh);
    slopeMeshes.push(mesh);

    loadProjectTexture(loader, face.texture)
      .then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.uniforms.uMap.value = tex;

        const img = tex.image;
        if (img && img.width && img.height) {
          mat.uniforms.uTexAspect.value = img.width / img.height;
          mat.uniforms.uPlaneAspect.value = geo.userData.planeAspect || 1;
        }

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
