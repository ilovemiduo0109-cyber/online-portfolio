import * as THREE from "three";
import { FACES } from "../config/faces.js";
import { getFaceFrame } from "../geometry/face-text.js";

const ACT1_DURATION = 0.5;
const ACT2_DURATION = 1.0;
const ACT3_DURATION = 0.5;
/** 解构位移 = 纪念碑尺度 × 此比例（默认 5%） */
const DECONSTRUCT_OFFSET_RATIO = 0.05;
const MONUMENT_BOUNDS_SIZE = 5.0;
const PULL_DISTANCE = 2.6;
const ACT3_NDC_MARGIN = 0.96;

const _toCam = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const _box3 = new THREE.Box3();
const _boxCorners = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];
const _textRelMatrix = new THREE.Matrix4();

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t) {
  return t ** 3;
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

/** 三幕过渡：idle → act1 → act2 → act3 → navigate */
export function createTransitionController(ctx) {
  const {
    scene,
    camera,
    controls,
    monument,
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
  let transitionBorder = null;
  let act2StartPos = new THREE.Vector3();
  let act2EndPos = new THREE.Vector3();
  let act2StartQuat = new THREE.Quaternion();
  let act2TargetQuat = new THREE.Quaternion();
  let act3StartScale = 1;
  let act3TargetScale = 1;
  const deconstructOrigins = new Map();

  const blueprintFadeMats = collectFadeMaterials(blueprintGroup);
  const zaojingFadeMats = collectFadeMaterials(zaojingGroup);

  function phaseProgress(duration) {
    return Math.min(1, (transitionClock.getElapsedTime() - phaseStart) / duration);
  }

  function getFaceOutwardAxis(faceVerts) {
    return getFaceFrame(faceVerts).normal.clone();
  }

  function computeFaceScreenQuaternion(faceVerts) {
    monument.updateMatrixWorld();
    const frame = getFaceFrame(faceVerts);
    let n = frame.normal.clone().transformDirection(monument.matrixWorld);
    const center = frame.bottomMid
      .clone()
      .add(frame.topMid)
      .multiplyScalar(0.5)
      .applyMatrix4(monument.matrixWorld);
    _toCam.copy(camera.position).sub(center).normalize();
    if (n.dot(_toCam) < 0) n.negate();

    const slopeUp = frame.up.clone().transformDirection(monument.matrixWorld).normalize();
    const camUp = new THREE.Vector3(0, 1, 0);
    let r = new THREE.Vector3().crossVectors(camUp, n);
    if (r.lengthSq() < 1e-5) {
      r.copy(frame.right.clone().transformDirection(monument.matrixWorld));
    }
    r.normalize();

    let u = new THREE.Vector3().crossVectors(n, r).normalize();
    if (u.dot(slopeUp) < 0) {
      u.negate();
      r.negate();
    }
    r.crossVectors(u, n).normalize();
    u.crossVectors(n, r).normalize();
    n.crossVectors(r, u).normalize();

    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n));
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

  function beginAct2() {
    const face = FACES.find((f) => f.id === activeFaceId);
    const mesh = slopeMeshes.find((m) => m.userData.faceId === activeFaceId);
    const textEntry = textMeshes.find((t) => t.face.id === activeFaceId);
    if (!face || !mesh) return;

    transitionGroup = new THREE.Group();
    scene.add(transitionGroup);

    const meshWorld = reparentToTransitionGroup(mesh);
    transitionGroup.position.copy(meshWorld.worldPos);
    transitionGroup.quaternion.copy(meshWorld.worldQuat);

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

    monument.updateMatrixWorld();
    const pullAxis = getFaceOutwardAxis(face.verts).transformDirection(monument.matrixWorld).normalize();
    _toCam.copy(camera.position).sub(transitionGroup.position).normalize();
    const pullDir = pullAxis.dot(_toCam) < 0 ? pullAxis.clone().negate() : pullAxis;

    act2StartPos.copy(transitionGroup.position);
    act2EndPos.copy(act2StartPos).addScaledVector(pullDir, PULL_DISTANCE);
    transitionGroup.getWorldQuaternion(act2StartQuat);
    act2TargetQuat.copy(computeFaceScreenQuaternion(face.verts));
  }

  function computeFillViewportScale(group) {
    group.updateMatrixWorld(true);
    _box3.setFromObject(group);
    if (_box3.isEmpty()) return 1;
    _boxCorners[0].set(_box3.min.x, _box3.min.y, _box3.min.z);
    _boxCorners[1].set(_box3.max.x, _box3.min.y, _box3.min.z);
    _boxCorners[2].set(_box3.min.x, _box3.max.y, _box3.min.z);
    _boxCorners[3].set(_box3.max.x, _box3.max.y, _box3.min.z);
    _boxCorners[4].set(_box3.min.x, _box3.min.y, _box3.max.z);
    _boxCorners[5].set(_box3.max.x, _box3.min.y, _box3.max.z);
    _boxCorners[6].set(_box3.min.x, _box3.max.y, _box3.max.z);
    _boxCorners[7].set(_box3.max.x, _box3.max.y, _box3.max.z);

    let maxNdc = 0;
    _boxCorners.forEach((c) => {
      _ndc.copy(c).project(camera);
      maxNdc = Math.max(maxNdc, Math.abs(_ndc.x), Math.abs(_ndc.y));
    });
    if (maxNdc < 1e-4) return 1;
    return ACT3_NDC_MARGIN / maxNdc;
  }

  function beginAct3() {
    const mesh = transitionGroup.children.find(
      (c) => c.userData?.faceId === activeFaceId && !c.userData.isText
    );
    if (mesh?.geometry && !transitionBorder) {
      transitionBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x111111 })
      );
      mesh.add(transitionBorder);
    }
    transitionGroup.updateMatrixWorld(true);
    act3StartScale = transitionGroup.scale.x;
    act3TargetScale = act3StartScale * computeFillViewportScale(transitionGroup);
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
        transitionState = "act2";
        phaseStart = transitionClock.getElapsedTime();
        beginAct2();
      }
      return;
    }

    if (transitionState === "act2") {
      const t = easeOutCubic(phaseProgress(ACT2_DURATION));
      transitionGroup.position.lerpVectors(act2StartPos, act2EndPos, t);
      transitionGroup.quaternion.copy(act2StartQuat).slerp(act2TargetQuat, t);
      if (phaseProgress(ACT2_DURATION) >= 1) {
        transitionState = "act3";
        phaseStart = transitionClock.getElapsedTime();
        beginAct3();
      }
      return;
    }

    if (transitionState === "act3") {
      const t = easeInCubic(phaseProgress(ACT3_DURATION));
      const s = THREE.MathUtils.lerp(act3StartScale, act3TargetScale, t);
      transitionGroup.scale.setScalar(s);
      if (phaseProgress(ACT3_DURATION) >= 1) {
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
