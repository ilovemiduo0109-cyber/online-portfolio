import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { detectMobile, applyMobileClass } from "../config/mobile.js";

const FALLBACK_LINKS = [
  { num: "01", href: "01-DunhuangReplication/", label: "Dunhuang Cave 285 Replication" },
  { num: "02", href: "02-GatehouseReplication/", label: "Beijing Siheyuan Gatehouse" },
  { num: "03", href: "03-VolunteerteachingProject/", label: "Yunnan Border Aesthetic Education" },
  { num: "04", href: "04-FolkrhymeArchiving/", label: "Xunyao Folk Rhyme Archiving" },
];

function showWebGLFallback(host) {
  const list = FALLBACK_LINKS.map(
    (p) =>
      `<li><a href="${p.href}"><span class="webgl-fallback-num">${p.num}</span> ${p.label}</a></li>`
  ).join("");
  host.innerHTML = `<div class="webgl-fallback" role="status">
    <p class="webgl-fallback-msg">3D view unavailable on this device.</p>
    <p class="webgl-fallback-sub">Open a project directly:</p>
    <ul class="webgl-fallback-list">${list}</ul>
  </div>`;
}

/** 主场景：renderer、camera、controls、灯光 */
export function setupScene() {
  const isMobile = detectMobile();
  applyMobileClass(isMobile);

  const host = document.getElementById("canvas-host");
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog(0xc4c2be, 14, 28);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 2.8, 9.5);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? "low-power" : "default",
    });
    if (!renderer.getContext()) {
      throw new Error("WebGL context unavailable");
    }
  } catch {
    showWebGLFallback(host);
    return { webglFailed: true, isMobile, host };
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
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
  controls.enablePan = !isMobile;
  controls.panSpeed = 0.4;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;

  if (isMobile) {
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enabled = false;
  }

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

  return { host, scene, camera, renderer, controls, isMobile, webglFailed: false };
}
