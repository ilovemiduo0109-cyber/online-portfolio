import * as THREE from "three";

export function computePlaneAspect(verts) {
  const { bottomW, topW, leftH, rightH } = computeSlopeEdgeMetrics(verts);
  return (bottomW + topW) * 0.5 / ((leftH + rightH) * 0.5);
}

/** 坡面四边形边长（v0 底左 → v1 底右 → v2 顶右 → v3 顶左） */
export function computeSlopeEdgeMetrics(verts) {
  const v0 = new THREE.Vector3(verts[0], verts[1], verts[2]);
  const v1 = new THREE.Vector3(verts[3], verts[4], verts[5]);
  const v2 = new THREE.Vector3(verts[6], verts[7], verts[8]);
  const v3 = new THREE.Vector3(verts[9], verts[10], verts[11]);
  const bottomW = v0.distanceTo(v1);
  const topW = v3.distanceTo(v2);
  const leftH = v0.distanceTo(v3);
  const rightH = v1.distanceTo(v2);
  const planeAspect = (bottomW + topW) * 0.5 / ((leftH + rightH) * 0.5);
  return { bottomW, topW, leftH, rightH, planeAspect };
}

/**
 * 梯形坡面 UV：按底/顶边宽与左右边高的比例设置角点 u/v，避免标准矩形 UV 在
 * 上宽下窄（覆斗顶）四边形上产生水平拉伸。纹理 v=1 为底、v=0 为顶。
 */
export function computeTrapezoidUVs(verts) {
  const { bottomW, topW } = computeSlopeEdgeMetrics(verts);
  const maxW = Math.max(bottomW, topW, 1e-6);
  return new Float32Array([
    0, 1,
    bottomW / maxW, 1,
    topW / maxW, 0,
    0, 0,
  ]);
}

/** 单坡面 + 梯形校正 UV */
export function createSlopeGeometry(verts) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(verts);
  const uvs = computeTrapezoidUVs(verts);
  const indices = [0, 1, 2, 0, 2, 3];
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData.planeAspect = computePlaneAspect(verts);
  geo.userData.edgeMetrics = computeSlopeEdgeMetrics(verts);
  return geo;
}
