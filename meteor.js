/**
 * 横向线条流星雨 — 右→左
 * 首页：默认尺寸与透明度
 * 子页：线条 ×0.5、透明度与首页相同；横穿时间 = 同距离首页随机速度下的时间 + 0.7s
 */
(function () {
  const isMobile = window.matchMedia(
    "(max-width: 768px), (hover: none) and (pointer: coarse)"
  ).matches;
  if (isMobile) return;

  const canvas = document.getElementById("meteor-layer");
  if (!canvas) return;

  const isSubpage =
    canvas.dataset.variant === "subpage" ||
    document.body.classList.contains("project-page");

  const SIZE_SCALE = isSubpage ? 0.5 : 1;
  const ALPHA_SCALE = 1;
  const SUBPAGE_CROSS_EXTRA_SEC = 0.7;
  const HOME_SPEED_MIN = 0.4;
  const HOME_SPEED_MAX = 1.9;
  const SPAWN_X_MIN = 100;
  const SPAWN_X_SPREAD = 250;

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let meteors = [];
  let lastFrameMs = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function homeSpeedPxPerSec() {
    const v = HOME_SPEED_MIN + Math.random() * (HOME_SPEED_MAX - HOME_SPEED_MIN);
    return v * 60;
  }

  function spawnX() {
    return w + SPAWN_X_MIN + Math.random() * SPAWN_X_SPREAD;
  }

  /** 横穿距离：右端 x 直至 m.x + len < 0 离开左侧 */
  function crossDistance(startX, len) {
    return startX + len;
  }

  function makeLine(startX) {
    const len = (18 + Math.random() * 180) * SIZE_SCALE;
    const x = startX ?? (isSubpage ? spawnX() : Math.random() * (w + 300 * SIZE_SCALE));
    const dist = crossDistance(x, len);
    const vHome = homeSpeedPxPerSec();
    const homeTimeSec = dist / vHome;
    const durationSec = isSubpage ? homeTimeSec + SUBPAGE_CROSS_EXTRA_SEC : homeTimeSec;
    const velocityPxPerSec = dist / durationSec;

    return {
      x,
      y: Math.random() * h,
      len,
      velocityPxPerSec,
      thick: (0.35 + Math.random() * 0.95) * SIZE_SCALE,
      alpha: (0.12 + Math.random() * 0.22) * ALPHA_SCALE,
    };
  }

  function spawn() {
    const count = Math.max(40, Math.floor((w * h) / 20000));
    meteors = [];
    for (let i = 0; i < count; i++) {
      meteors.push(makeLine());
    }
  }

  function tick(now) {
    if (!w || !h) return;
    if (!lastFrameMs) lastFrameMs = now;
    const dt = Math.min(0.05, (now - lastFrameMs) / 1000);
    lastFrameMs = now;

    ctx.clearRect(0, 0, w, h);

    for (const m of meteors) {
      m.x -= m.velocityPxPerSec * dt;
      if (m.x + m.len < 0) {
        Object.assign(m, makeLine(spawnX()));
      }

      ctx.strokeStyle = `rgba(35, 35, 35, ${m.alpha})`;
      ctx.lineWidth = m.thick;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.len, m.y);
      ctx.stroke();
    }

    requestAnimationFrame(tick);
  }

  resize();
  spawn();
  window.addEventListener("resize", () => {
    resize();
    spawn();
  });
  requestAnimationFrame(tick);
})();
