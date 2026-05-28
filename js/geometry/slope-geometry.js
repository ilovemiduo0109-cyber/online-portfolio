import * as THREE from "three";

export function computePlaneAspect(verts) {
  const v0 = new THREE.Vector3(verts[0], verts[1], verts[2]);
  const v1 = new THREE.Vector3(verts[3], verts[4], verts[5]);
  const v2 = new THREE.Vector3(verts[6], verts[7], verts[8]);
  const v3 = new THREE.Vector3(verts[9], verts[10], verts[11]);
  const bottomW = v0.distanceTo(v1);
  const topW = v3.distanceTo(v2);
  const leftH = v0.distanceTo(v3);
  const rightH = v1.distanceTo(v2);
  return (bottomW + topW) * 0.5 / ((leftH + rightH) * 0.5);
}

/** 单坡面 + UV（坡面宽高比供 cover 铺满） */
export function createSlopeGeometry(verts) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(verts);
  const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
  const indices = [0, 1, 2, 0, 2, 3];
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData.planeAspect = computePlaneAspect(verts);
  return geo;
}
