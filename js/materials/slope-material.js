import * as THREE from "three";

const slopeVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const slopeFragmentShader = `
  uniform sampler2D uMap;
  uniform float uFocus;
  uniform float uFade;
  uniform float uTransitionOpacity;
  uniform float uTexAspect;
  uniform float uPlaneAspect;
  uniform float uZoom;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    if (uTexAspect > uPlaneAspect) {
      float s = uTexAspect / uPlaneAspect;
      uv.x = (uv.x - 0.5) / s + 0.5;
    } else if (uTexAspect < uPlaneAspect) {
      float s = uPlaneAspect / uTexAspect;
      uv.y = (uv.y - 0.5) / s + 0.5;
    }

    float zoom = mix(1.0, uZoom, uFocus);
    uv = (uv - 0.5) / zoom + 0.5;
    uv = clamp(uv, 0.0, 1.0);

    vec4 photo = texture2D(uMap, uv);
    float lum = dot(photo.rgb, vec3(0.2126, 0.7152, 0.0722));
    float sat = mix(0.25, 0.65, uFocus);
    vec3 rgb = mix(vec3(lum), photo.rgb, sat);
    rgb = min(rgb * 1.1, vec3(1.0));
    float alpha = mix(0.45, 1.0, uFocus) * (1.0 - uFade * 0.45) * uTransitionOpacity;
    gl_FragColor = vec4(rgb, alpha);
  }
`;

/** 坡面 Shader（手稿默认 + 暗房显影） */
export function createSlopeMaterial(map, hatch) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uHatch: { value: hatch },
      uFocus: { value: 0 },
      uFade: { value: 0 },
      uTransitionOpacity: { value: 1 },
      uTexAspect: { value: 1 },
      uPlaneAspect: { value: 1 },
      uZoom: { value: 1.04 },
    },
    vertexShader: slopeVertexShader,
    fragmentShader: slopeFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}
