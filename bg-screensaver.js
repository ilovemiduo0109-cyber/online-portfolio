/**
 * 背景云雾光效 — 团状柔光忽明忽暗、随机变幻，不改变底层明度
 */
(function () {
  const canvas = document.getElementById("bg-screensaver");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let clouds = [];
  let reducedMotion = false;
  const CLOUD_COUNT = 8;
  /** 放远一倍 → 云团尺度 ×0.5 */
  const BG_DISTANCE = 0.5;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickLuminanceTarget(c) {
    const strong = Math.random() > 0.35;
    c.tLum = strong
      ? (Math.random() > 0.5 ? rand(0.55, 1) : rand(-1, -0.55))
      : rand(-0.45, 0.45);
    c.nextLum = performance.now() + rand(2600, 6200);
  }

  function pickMorphTarget(c) {
    const pad = c.r * 0.5;
    c.tx = rand(pad, w - pad);
    c.ty = rand(pad, h - pad);
    c.tr = rand(Math.min(w, h) * 0.32, Math.min(w, h) * 0.72) * BG_DISTANCE;
    c.nextMorph = performance.now() + rand(6000, 14000);
  }

  function makeCloud() {
    const min = Math.min(w, h);
    const r = rand(min * 0.38, min * 0.62) * BG_DISTANCE;
    const c = {
      x: rand(0, w),
      y: rand(0, h),
      tx: 0,
      ty: 0,
      r,
      tr: r,
      lum: 0,
      tLum: 0,
      phase: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      breathe: rand(0.0016, 0.0028),
      nextLum: 0,
      nextMorph: 0,
      easeLum: rand(0.0045, 0.009),
      easeMorph: rand(0.0012, 0.003),
    };
    pickLuminanceTarget(c);
    pickMorphTarget(c);
    c.tx = c.x;
    c.ty = c.y;
    c.tr = c.r;
    c.lum = c.tLum;
    return c;
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    clouds = Array.from({ length: CLOUD_COUNT }, makeCloud);
  }

  function drawCloud(c, lum) {
    const peak = Math.abs(lum);
    if (peak < 0.025) return;

    const blur = Math.max(24, c.r * 0.42);
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = 1;

    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    if (lum > 0) {
      const a = peak * 0.28;
      g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      g.addColorStop(0.32, `rgba(255, 255, 255, ${a * 0.42})`);
      g.addColorStop(0.68, `rgba(255, 255, 255, ${a * 0.1})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
    } else {
      const a = peak * 0.2;
      g.addColorStop(0, `rgba(138, 136, 132, ${a})`);
      g.addColorStop(0.38, `rgba(158, 156, 152, ${a * 0.45})`);
      g.addColorStop(0.72, "rgba(188, 186, 182, 0)");
      g.addColorStop(1, "rgba(188, 186, 182, 0)");
    }

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";
  }

  function tick(now) {
    ctx.clearRect(0, 0, w, h);

    for (const c of clouds) {
      if (now >= c.nextLum) pickLuminanceTarget(c);
      if (now >= c.nextMorph) pickMorphTarget(c);

      c.lum += (c.tLum - c.lum) * c.easeLum;
      c.x += (c.tx - c.x) * c.easeMorph;
      c.y += (c.ty - c.y) * c.easeMorph;
      c.r += (c.tr - c.r) * c.easeMorph;
      c.phase += c.breathe;
      c.phase2 += c.breathe * 0.48;

      const breathMain = Math.sin(c.phase) * 0.42;
      const breathSub = Math.sin(c.phase2) * 0.14;
      const lum = Math.max(-1, Math.min(1, c.lum + breathMain + breathSub));
      drawCloud(c, lum);
    }

    requestAnimationFrame(tick);
  }

  function init() {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resize();
    if (reducedMotion) {
      for (const c of clouds) {
        c.lum = rand(-0.35, 0.35);
        drawCloud(c, c.lum);
      }
      return;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  init();
})();
