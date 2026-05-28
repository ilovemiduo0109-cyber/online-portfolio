import * as THREE from "three";
import {
  createSlopeTextMesh,
  orientFaceText,
} from "../geometry/face-text.js";

function disposeTextMesh(mesh) {
  if (!mesh) return;
  mesh.material.map?.dispose();
  mesh.material.dispose();
  mesh.geometry.dispose();
}

function rebuildFaceText(ctx, entry, focus) {
  const { face, layout, mesh } = entry;
  const parent = mesh.parent;
  parent.remove(mesh);
  disposeTextMesh(mesh);

  const neu = createSlopeTextMesh(face, focus, layout);
  orientFaceText(ctx, neu, layout);
  parent.add(neu);
  entry.mesh = neu;
  entry.lastFocus = focus;
}

/** Raycaster + 悬停显影 + 点击触发过渡 */
export function setupInteraction(ctx, transition) {
  const {
    host,
    camera,
    renderer,
    slopeMeshes,
    textMeshes,
    interaction,
  } = ctx;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function setFaceFocus(id, focus, fade) {
    slopeMeshes.forEach((m) => {
      const isTarget = m.userData.faceId === id;
      const f = isTarget ? focus : 0;
      const fd = id && !isTarget ? fade : 0;
      m.material.uniforms.uFocus.value = THREE.MathUtils.lerp(
        m.material.uniforms.uFocus.value,
        f,
        0.12
      );
      m.material.uniforms.uFade.value = THREE.MathUtils.lerp(
        m.material.uniforms.uFade.value,
        fd,
        0.12
      );
    });

    textMeshes.forEach((entry) => {
      const foc = entry.face.id === id ? focus : 0;
      if (Math.abs(foc - (entry.lastFocus || 0)) > 0.15) {
        rebuildFaceText(ctx, entry, foc);
      }
    });
  }

  function resetInteractionState() {
    interaction.hoveredId = null;
    interaction.touchingMonument = false;
    document.body.style.cursor = "default";
    setFaceFocus(null, 0, 0);
  }

  function updateHoverFromPointer(e) {
    if (transition.isTransitioning) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(slopeMeshes, false);
    interaction.touchingMonument = hits.length > 0;

    if (hits.length) {
      const id = hits[0].object.userData.faceId;
      if (interaction.hoveredId !== id) {
        interaction.hoveredId = id;
        document.body.style.cursor = "pointer";
      }
      setFaceFocus(id, 1, 1);
    } else {
      interaction.hoveredId = null;
      document.body.style.cursor = "default";
      setFaceFocus(null, 0, 0.6);
    }
  }

  host.addEventListener("pointerleave", () => {
    resetInteractionState();
  });

  host.addEventListener("pointerenter", updateHoverFromPointer);
  host.addEventListener("pointermove", updateHoverFromPointer);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      resetInteractionState();
    }
  });

  host.addEventListener("click", () => {
    if (transition.isTransitioning || !interaction.hoveredId) return;
    const m = slopeMeshes.find((s) => s.userData.faceId === interaction.hoveredId);
    if (m?.userData.href) transition.beginTransition(interaction.hoveredId, m.userData.href);
  });

  return { resetInteractionState, setFaceFocus };
}
