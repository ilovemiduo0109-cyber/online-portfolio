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
  uniform float uZoom;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    float zoom = mix(1.0, uZoom, uFocus);
    uv = (uv - 0.5) / zoom + 0.5;

    vec4 photo = texture2D(uMap, uv);
    if (photo.a < 0.3) discard;

    vec3 straight = photo.rgb / max(photo.a, 0.001);
    float lum = dot(straight, vec3(0.2126, 0.7152, 0.0722));
    float sat = mix(0.25, 0.65, uFocus);
    straight = mix(vec3(lum), straight, sat);
    if (photo.a >= 0.5) {
      straight = min(straight * 1.1, vec3(1.0));
    }
    vec3 rgb = straight * photo.a;
    float alpha = photo.a * mix(0.92, 1.0, uFocus) * (1.0 - uFade * 0.45) * uTransitionOpacity;
    gl_FragColor = vec4(rgb, alpha);
  }
`;

/** 坡面 Shader（手稿默认 + 暗房显影；profile 使用 PNG alpha，完整 UV 不 cover 裁剪） */
export function createSlopeMaterial(map, hatch) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uHatch: { value: hatch },
      uFocus: { value: 0 },
      uFade: { value: 0 },
      uTransitionOpacity: { value: 1 },
      uZoom: { value: 1.04 },
    },
    vertexShader: slopeVertexShader,
    fragmentShader: slopeFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
