import * as THREE from "three";

const MONUMENT_SCREEN_HEIGHT = 0.5;
const _fitBox = new THREE.Box3();
const _fitCorner = new THREE.Vector3();

/** 纪念碑在屏幕上的垂直占比，用于初始/resize 相机距离 */
export function createCameraFitter(ctx) {
  function getMonumentScreenHeightFraction() {
    const { monument, camera } = ctx;
    monument.updateMatrixWorld(true);
    _fitBox.setFromObject(monument);
    const { min, max } = _fitBox;
    const corners = [
      [min.x, min.y, min.z],
      [min.x, min.y, max.z],
      [min.x, max.y, min.z],
      [min.x, max.y, max.z],
      [max.x, min.y, min.z],
      [max.x, min.y, max.z],
      [max.x, max.y, min.z],
      [max.x, max.y, max.z],
    ];
    let ndcMinY = 1;
    let ndcMaxY = -1;
    corners.forEach(([x, y, z]) => {
      _fitCorner.set(x, y, z);
      _fitCorner.project(camera);
      ndcMinY = Math.min(ndcMinY, _fitCorner.y);
      ndcMaxY = Math.max(ndcMaxY, _fitCorner.y);
    });
    return (ndcMaxY - ndcMinY) * 0.5;
  }

  function fitCameraToMonumentScreenHeight(targetFraction = MONUMENT_SCREEN_HEIGHT) {
    const { camera, controls } = ctx;
    const anchor = controls.target.clone();
    for (let i = 0; i < 8; i++) {
      const frac = getMonumentScreenHeightFraction();
      if (Math.abs(frac - targetFraction) < 0.008) break;
      const offset = camera.position.clone().sub(anchor);
      offset.multiplyScalar(frac / targetFraction);
      camera.position.copy(anchor).add(offset);
      camera.updateProjectionMatrix();
    }
    controls.update();
  }

  return { fitCameraToMonumentScreenHeight };
}
