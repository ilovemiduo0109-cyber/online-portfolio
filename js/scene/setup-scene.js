import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/** 主场景：renderer、camera、controls、灯光 */
export function setupScene() {
  const host = document.getElementById("canvas-host");
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog(0xc4c2be, 14, 28);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 2.8, 9.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 1.4, 0);
  controls.minDistance = 4;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.enablePan = true;
  controls.panSpeed = 0.4;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;

  const _orbitOffset = new THREE.Vector3();
  const _orbitSpherical = new THREE.Spherical();
  _orbitOffset.subVectors(camera.position, controls.target);
  _orbitSpherical.setFromVector3(_orbitOffset);
  _orbitSpherical.phi = Math.max(
    controls.minPolarAngle,
    _orbitSpherical.phi - (20 * Math.PI) / 180
  );
  _orbitOffset.setFromSpherical(_orbitSpherical);
  camera.position.copy(controls.target).add(_orbitOffset);
  controls.update();

  scene.add(new THREE.AmbientLight(0xe8e6e2, 0.5));
  const key = new THREE.SpotLight(0xfff6ee, 28, 30, Math.PI / 5, 0.35, 1.2);
  key.position.set(4, 9, 5);
  key.target.position.set(0, 1.2, 0);
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xd8d6d2, 0.35);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.25);
  rim.position.set(0, 2, -8);
  scene.add(rim);

  return { host, scene, camera, renderer, controls };
}
