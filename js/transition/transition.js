import * as THREE from "three";
import { getFaceFrame } from "../geometry/face-text.js";

const ACT1_DURATION = 0.5;
/** 解构位移 = 纪念碑尺度 × 此比例（默认 5%） */
const DECONSTRUCT_OFFSET_RATIO = 0.05;
const MONUMENT_BOUNDS_SIZE = 5.0;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function setMaterialOpacity(mat, opacity) {
  if (!mat) return;
  mat.transparent = true;
  mat.opacity = opacity;
  mat.needsUpdate = true;
}

function collectFadeMaterials(root) {
  const mats = [];
  root.traverse((obj) => {
    if (obj.material) {
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      list.forEach((m) => {
        if (m.opacity !== undefined) mats.push(m);
      });
    }
  });
  return mats;
}

/** 过渡：idle → act1（其它面撤退，被点面不动）→ navigate */
export function createTransitionController(ctx) {
  const {
    controls,
    slopeMeshes,
    textMeshes,
    blueprintGroup,
    zaojingGroup,
    interaction,
  } = ctx;

  const transitionClock = new THREE.Clock();
  let transitionState = "idle";
  let isTransitioning = false;
  let phaseStart = 0;
  let activeFaceId = null;
  let activeHref = null;
  const deconstructOrigins = new Map();

  const blueprintFadeMats = collectFadeMaterials(blueprintGroup);
  const zaojingFadeMats = collectFadeMaterials(zaojingGroup);

  function phaseProgress(duration) {
    return Math.min(1, (transitionClock.getElapsedTime() - phaseStart) / duration);
  }

  function getFaceOutwardAxis(faceVerts) {
    return getFaceFrame(faceVerts).normal.clone();
  }

  function storeDeconstructOrigins(faceId) {
    deconstructOrigins.clear();
    const dist = MONUMENT_BOUNDS_SIZE * DECONSTRUCT_OFFSET_RATIO;
    const topOffset = new THREE.Vector3(0, dist, 0);

    slopeMeshes.forEach((mesh) => {
      if (mesh.userData.faceId === faceId) return;
      const face = mesh.userData.face;
      const axis = getFaceOutwardAxis(face.verts);
      deconstructOrigins.set(mesh, {
        pos: mesh.position.clone(),
        axis,
        dist,
        opacity: 1,
        type: "slope",
      });
    });

    textMeshes.forEach(({ mesh, face }) => {
      if (face.id === faceId) return;
      deconstructOrigins.set(mesh, {
        pos: mesh.position.clone(),
        axis: getFaceOutwardAxis(face.verts),
        dist,
        opacity: mesh.material.opacity,
        type: "text",
      });
    });

    deconstructOrigins.set(blueprintGroup, {
      pos: blueprintGroup.position.clone(),
      axis: topOffset.clone().normalize(),
      dist,
      type: "group",
      fadeMats: blueprintFadeMats.map((m) => ({ mat: m, opacity: m.opacity })),
    });
    deconstructOrigins.set(zaojingGroup, {
      pos: zaojingGroup.position.clone(),
      axis: topOffset.clone().normalize(),
      dist,
      type: "group",
      fadeMats: zaojingFadeMats.map((m) => ({ mat: m, opacity: m.opacity })),
    });
  }

  function updateAct1(t) {
    const e = easeOutCubic(t);
    const fade = 1 - e;

    deconstructOrigins.forEach((orig, obj) => {
      if (orig.type === "slope") {
        obj.position.copy(orig.pos).addScaledVector(orig.axis, orig.dist * e);
        obj.material.uniforms.uTransitionOpacity.value = fade;
      } else if (orig.type === "text") {
        obj.position.copy(orig.pos).addScaledVector(orig.axis, orig.dist * e);
        setMaterialOpacity(obj.material, orig.opacity * fade);
      } else if (orig.type === "group") {
        obj.position.copy(orig.pos).add(orig.axis.clone().multiplyScalar(orig.dist * e));
        orig.fadeMats.forEach(({ mat, opacity }) => setMaterialOpacity(mat, opacity * fade));
      }
    });
  }

  function navigateToProject(href) {
    try {
      sessionStorage.setItem("monument-from-transition", "1");
    } catch {
      /* ignore */
    }
    const go = () => {
      window.location.href = href;
    };
    if (document.startViewTransition) {
      document.startViewTransition(go);
    } else {
      go();
    }
  }

  function beginTransition(faceId, href) {
    if (isTransitioning) return;
    if (ctx.isMobile) {
      navigateToProject(href);
      return;
    }
    isTransitioning = true;
    transitionState = "act1";
    activeFaceId = faceId;
    activeHref = href;
    phaseStart = transitionClock.getElapsedTime();
    controls.enabled = false;
    document.body.style.cursor = "default";
    interaction.hoveredId = faceId;
    interaction.touchingMonument = false;

    slopeMeshes.forEach((m) => {
      const active = m.userData.faceId === faceId;
      m.material.uniforms.uFocus.value = active ? 1 : 0;
      m.material.uniforms.uFade.value = 0;
      m.material.uniforms.uTransitionOpacity.value = 1;
    });

    storeDeconstructOrigins(faceId);
  }

  function updateTransition() {
    if (!isTransitioning) return;

    if (transitionState === "act1") {
      const t = phaseProgress(ACT1_DURATION);
      updateAct1(t);
      if (t >= 1) {
        navigateToProject(activeHref);
      }
    }
  }

  return {
    beginTransition,
    updateTransition,
    get isTransitioning() {
      return isTransitioning;
    },
  };
}
