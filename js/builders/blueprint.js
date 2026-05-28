import * as THREE from "three";

/** 线稿结构（Blueprint wires） */
export function buildBlueprint(monument) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.55,
  });
  const b = 0.55;
  const B = 2.35;
  const D = 2.05;
  const H = 3.1;

  const edges = [
    [-B, H, D, B, H, D],
    [B, H, D, B, H, -D],
    [B, H, -D, -B, H, -D],
    [-B, H, -D, -B, H, D],
    [-b, 0, b, b, 0, b],
    [b, 0, b, b, 0, -b],
    [b, 0, -b, -b, 0, -b],
    [-b, 0, -b, -b, 0, b],
  ];
  const pts = [];
  edges.forEach((e) => pts.push(new THREE.Vector3(e[0], e[1], e[2]), new THREE.Vector3(e[3], e[4], e[5])));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  g.add(new THREE.LineSegments(geo, mat));

  const rimH = 0.08 * 0.6;
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, rimH, 1.05)),
    new THREE.LineBasicMaterial({ color: 0x111111, opacity: 0.7, transparent: true })
  );
  rim.position.y = rimH * 0.5;
  g.add(rim);

  monument.add(g);
  return g;
}
