import * as THREE from "three";
import { getFaceFrame } from "../geometry/face-text.js";

const ACT1_DURATION = 0.5;
const SCALE_DURATION = 0.5;
const ACTIVE_FACE_SCALE = 1.15;
/** 解构位移 = 纪念碑尺度 × 此比例（默认 5%） */
const DECONSTRUCT_OFFSET_RATIO = 0.05;
const MONUMENT_BOUNDS_SIZE = 5.0;

const _textRelMatrix = new THREE.Matrix4();

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

/** 过渡：idle → act1（其它面撤退）→ scale（被点面微放大）→ navigate */
export function createTransitionController(ctx) {
  const {
    scene,
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
  let transitionGroup = null;
  let scaleStart = 1;
  let scaleTarget = ACTIVE_FACE_SCALE;
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

  function reparentToTransitionGroup(mesh) {
    mesh.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);
    scene.attach(mesh);
    transitionGroup.add(mesh);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    return { worldPos, worldQuat };
  }

  /** 固定世界位姿，仅用于后续 scale */
  function beginActiveFaceGroup() {
    const mesh = slopeMeshes.find((m) => m.userData.faceId === activeFaceId);
    const textEntry = textMeshes.find((t) => t.face.id === activeFaceId);
    if (!mesh) return;

    transitionGroup = new THREE.Group();
    scene.add(transitionGroup);

    const meshWorld = reparentToTransitionGroup(mesh);
    transitionGroup.position.copy(meshWorld.worldPos);
    transitionGroup.quaternion.copy(meshWorld.worldQuat);
    transitionGroup.scale.setScalar(1);

    if (textEntry) {
      const textMesh = textEntry.mesh;
      textMesh.updateMatrixWorld(true);
      mesh.updateMatrixWorld(true);
      _textRelMatrix.copy(mesh.matrixWorld).invert().multiply(textMesh.matrixWorld);
      scene.attach(textMesh);
      mesh.add(textMesh);
      textMesh.matrix.copy(_textRelMatrix);
      textMesh.matrix.decompose(textMesh.position, textMesh.quaternion, textMesh.scale);
      textMesh.scale.set(1, 1, 1);
    }

    scaleStart = 1;
    scaleTarget = ACTIVE_FACE_SCALE;
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
        transitionState = "scale";
        phaseStart = transitionClock.getElapsedTime();
        beginActiveFaceGroup();
      }
      return;
    }

    if (transitionState === "scale") {
      const t = easeOutCubic(phaseProgress(SCALE_DURATION));
      const s = THREE.MathUtils.lerp(scaleStart, scaleTarget, t);
      transitionGroup.scale.setScalar(s);
      if (phaseProgress(SCALE_DURATION) >= 1) {
        transitionState = "navigate";
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
