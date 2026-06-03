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
 * 梯形 UV：窄边（y=0，v0–v1）在贴图顶行居中占宽 bottomW/topW；宽边（y=3.1）占底行 u=0..1。
 * 与上窄下宽、顶边内缩的透明梯形 profile.png 四角对齐。
 */
export function computeTrapezoidUVs(verts) {
  const { bottomW, topW } = computeSlopeEdgeMetrics(verts);
  const maxW = Math.max(topW, 1e-6);
  const m = Math.max(0, (1 - bottomW / maxW) * 0.5);
  return new Float32Array([m, 1, 1 - m, 1, 1, 0, 0, 0]);
}

/** 单坡面四边形 + 梯形校正 UV（v0 底左 → v1 底右 → v2 顶右 → v3 顶左） */
export function createSlopeGeometry(verts) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(verts);
  const uvs = computeTrapezoidUVs(verts);
  const indices = [0, 1, 2, 0, 2, 3];
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const metrics = computeSlopeEdgeMetrics(verts);
  geo.userData.planeAspect = metrics.planeAspect;
  geo.userData.edgeMetrics = metrics;
  geo.userData.uvMargin = (1 - metrics.bottomW / Math.max(metrics.topW, 1e-6)) * 0.5;
  return geo;
}
