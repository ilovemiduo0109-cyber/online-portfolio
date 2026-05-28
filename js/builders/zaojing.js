import * as THREE from "three";
import { createGrainTexture } from "../materials/procedural-textures.js";
import { createTextPanel } from "../geometry/face-text.js";

/** 藻井深渊 */
export function buildZaojing(monument) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xdcdcda,
    roughness: 0.92,
    metalness: 0.02,
    map: createGrainTexture(),
  });
  const wellH = 0.18 * 0.6;
  const well = new THREE.Mesh(new THREE.BoxGeometry(0.92, wellH, 0.92), wallMat);
  well.position.y = -wellH * 0.5;
  group.add(well);

  const lipH = 0.02 * 0.6;
  const lip = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, lipH, 1.02)),
    new THREE.LineBasicMaterial({ color: 0x111111 })
  );
  lip.position.y = lipH * 0.5;
  group.add(lip);

  const label = createTextPanel(
    {
      tag: "[ ZAOJING // CORE ]",
      title: "WEN TIAN ARCHITECTURE",
      epigraph: "",
    },
    1,
    {
      canvasW: 1024,
      canvasH: 512,
      maxTextWidth: 860,
      planeW: 2.8,
      planeH: 1.4,
    }
  );
  label.scale.set(0.42, 0.22, 1);
  label.rotation.x = -Math.PI / 2;
  label.position.y = lipH * 0.5 + 0.04;
  group.add(label);

  monument.add(group);
  return group;
}
