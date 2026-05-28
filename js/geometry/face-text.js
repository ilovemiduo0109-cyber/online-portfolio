import * as THREE from "three";

const _pitCenter = new THREE.Vector3(0, 1.35, 0);
const _towardPit = new THREE.Vector3();
const _edge1 = new THREE.Vector3();
const _edge2 = new THREE.Vector3();
const _scratch = new THREE.Vector3();

export function getFaceFrame(verts) {
  const v0 = new THREE.Vector3(verts[0], verts[1], verts[2]);
  const v1 = new THREE.Vector3(verts[3], verts[4], verts[5]);
  const v2 = new THREE.Vector3(verts[6], verts[7], verts[8]);
  const v3 = new THREE.Vector3(verts[9], verts[10], verts[11]);
  const bottomMid = v0.clone().add(v1).multiplyScalar(0.5);
  const topMid = v3.clone().add(v2).multiplyScalar(0.5);
  const up = topMid.clone().sub(bottomMid).normalize();
  const right = v1.clone().sub(v0).add(v2.clone().sub(v3)).multiplyScalar(0.5).normalize();
  const normal = new THREE.Vector3().crossVectors(right, up).normalize();

  const faceCenter = bottomMid.clone().add(topMid).multiplyScalar(0.5);
  _towardPit.copy(_pitCenter).sub(faceCenter);
  if (normal.dot(_towardPit) < 0) normal.negate();
  if (normal.dot(_towardPit.clone().normalize()) < 0.85) {
    const upLenSq = up.lengthSq();
    normal.copy(_towardPit);
    if (upLenSq > 1e-8) {
      normal.addScaledVector(up, -normal.dot(up) / upLenSq);
    }
    normal.normalize();
    if (normal.dot(_towardPit) < 0) normal.negate();
  }

  return {
    bottomMid,
    topMid,
    up,
    right,
    normal,
    bottomW: v0.distanceTo(v1),
    topW: v3.distanceTo(v2),
    faceHeight: bottomMid.distanceTo(topMid),
  };
}

const FACE_TEXT_SCALE = 1.638;
const TEXT_SURFACE_EPS = 0.002;

export function computeFaceTextLayout(verts) {
  const v0 = new THREE.Vector3(verts[0], verts[1], verts[2]);
  const v1 = new THREE.Vector3(verts[3], verts[4], verts[5]);
  const v2 = new THREE.Vector3(verts[6], verts[7], verts[8]);
  const v3 = new THREE.Vector3(verts[9], verts[10], verts[11]);
  const bottomMid = v0.clone().add(v1).multiplyScalar(0.5);
  const topMid = v2.clone().add(v3).multiplyScalar(0.5);
  const slopeUp = topMid.clone().sub(bottomMid);

  const t = 2 / 3;
  const left = v0.clone().lerp(v3, t);
  const right = v1.clone().lerp(v2, t);
  const surfaceCenter = left.clone().add(right).multiplyScalar(0.5);
  const rightDir = right.clone().sub(left).normalize();

  _edge1.subVectors(v1, v0);
  _edge2.subVectors(v3, v0);
  let normal = new THREE.Vector3().crossVectors(_edge1, _edge2).normalize();
  _towardPit.copy(_pitCenter).sub(surfaceCenter);
  if (normal.dot(_towardPit) < 0) normal.negate();

  const nOut = normal.clone().negate();

  let r = rightDir.clone();
  r.addScaledVector(normal, -r.dot(normal));
  if (r.lengthSq() < 1e-8) {
    r.copy(_edge1);
    r.addScaledVector(normal, -r.dot(normal));
  }
  r.normalize();

  let u = _scratch.copy(normal).cross(r).normalize();
  if (u.dot(slopeUp) < 0) u.negate();

  let n = new THREE.Vector3().crossVectors(r, u).normalize();
  if (n.dot(nOut) < 0) {
    u.negate();
    n.crossVectors(r, u).normalize();
  }

  const center = surfaceCenter.clone().addScaledVector(nOut, TEXT_SURFACE_EPS);

  const widthAtT = left.distanceTo(right);
  const faceHeight = bottomMid.distanceTo(topMid);
  const planeW = widthAtT * 0.78 * FACE_TEXT_SCALE;
  const planeH = faceHeight * 0.34 * FACE_TEXT_SCALE;
  const canvasW = 1024;
  const canvasH = Math.max(280, Math.round(canvasW * (planeH / planeW)));

  return {
    center,
    u,
    n,
    r,
    rightDir,
    normal,
    bottomMid,
    topMid,
    bottomW: v0.distanceTo(v1),
    topW: v2.distanceTo(v3),
    faceHeight,
    planeW,
    planeH,
    canvasW,
    canvasH,
    maxTextWidth: canvasW * 0.84,
  };
}

function wrapWords(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawFaceTextCanvas(face, focus, layout) {
  const { canvasW: W, canvasH: H, maxTextWidth, planeH } = layout;
  const tagSize = Math.max(11, Math.round(planeH * 14));
  const titleSize = Math.max(12, Math.round(planeH * 16));
  const epSize = Math.max(10, Math.round(planeH * 12));
  const titleLineH = titleSize * 1.38;
  const epLineH = epSize * 1.38;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(255,255,255,${0.5 + focus * 0.5})`;

  ctx.font = `400 ${tagSize}px "Lora", serif`;
  const tagLines = wrapWords(ctx, face.tag, maxTextWidth);
  let y = H * 0.2 + tagSize * 0.5;
  tagLines.forEach((t) => {
    ctx.fillText(t, W / 2, y);
    y += tagSize * 1.35;
  });

  ctx.font = `700 ${titleSize}px "JetBrains Mono", monospace`;
  const titleLines = wrapWords(ctx, face.title, maxTextWidth);
  y += titleSize * 0.25;
  titleLines.forEach((t) => {
    ctx.fillText(t, W / 2, y);
    y += titleLineH;
  });

  if (focus > 0.5) {
    ctx.font = `italic 400 ${epSize}px "Lora", serif`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const epLines = wrapWords(ctx, face.epigraph, maxTextWidth);
    y += epSize * 0.35;
    epLines.forEach((t) => {
      ctx.fillText(t, W / 2, y);
      y += epLineH;
    });
  }

  return canvas;
}

export function createFaceTextTexture(face, focus, layout) {
  const tex = new THREE.CanvasTexture(drawFaceTextCanvas(face, focus, layout));
  tex.anisotropy = 4;
  return tex;
}

/** 坡面标题：单 mesh，DoubleSide */
export function createSlopeTextMesh(face, focus, layout) {
  const tex = createFaceTextTexture(face, focus, layout);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layout.planeW, layout.planeH), mat);
  mesh.userData.isText = true;
  mesh.userData.faceId = face.id;
  mesh.renderOrder = 10;
  return mesh;
}

/** 藻井等独立标签 */
export function createTextPanel(face, focus, layout) {
  return createSlopeTextMesh(face, focus, layout);
}

/** 右手正交基 r×u=n，与坡面共面；仅在创建/悬停重建时调用 */
export function orientFaceText(_ctx, text, layout) {
  const r = layout.r.clone();
  const u = layout.u.clone();
  const n = layout.n.clone();

  text.position.copy(layout.center);
  text.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n));
  text.scale.set(1, 1, 1);
}
