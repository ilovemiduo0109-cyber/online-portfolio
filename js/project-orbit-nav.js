/**
 * Subpage → subpage: rotate article only (bg + meteors stay fixed).
 * Triggered by #project-next. ~0.72s exit + ~0.72s enter.
 */
(function () {
  const ORBIT_MS = 720;
  const ORIGIN_V = 0.42;
  const STORAGE_ENTER = "project-orbit-enter";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getArticle() {
    return document.querySelector(".project-page article");
  }

  function setTransformOrigin(article) {
    const r = article.getBoundingClientRect();
    const oy = ((window.innerHeight * ORIGIN_V - r.top) / r.height) * 100;
    article.style.transformOrigin = `50% ${Math.max(0, Math.min(100, oy))}%`;
  }

  function lockScroll() {
    const y = window.scrollY;
    document.body.dataset.orbitScrollY = String(y);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
  }

  function clearOrbitClasses(article) {
    document.documentElement.classList.remove(
      "orbit-nav-active",
      "project-orbit-enter"
    );
    if (article) {
      article.classList.remove("orbit-nav-exit", "orbit-nav-enter-active");
      article.style.transformOrigin = "";
      article.style.willChange = "";
    }
  }

  /* Early class for enter (also set via inline in subpage <head>) */
  try {
    if (
      !prefersReducedMotion() &&
      sessionStorage.getItem(STORAGE_ENTER) === "1"
    ) {
      document.documentElement.classList.add(
        "orbit-nav-active",
        "project-orbit-enter"
      );
    }
  } catch {
    /* ignore */
  }

  function runEnter() {
    let flag = false;
    try {
      flag = sessionStorage.getItem(STORAGE_ENTER) === "1";
      if (flag) sessionStorage.removeItem(STORAGE_ENTER);
    } catch {
      /* ignore */
    }
    if (!flag || prefersReducedMotion()) return;

    const article = getArticle();
    if (!article) return;

    document.documentElement.classList.add(
      "orbit-nav-active",
      "project-orbit-enter"
    );
    setTransformOrigin(article);
    article.style.willChange = "transform, opacity";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        article.classList.add("orbit-nav-enter-active");
      });
    });

    const done = (ev) => {
      if (ev.target !== article || ev.propertyName !== "transform") return;
      article.removeEventListener("transitionend", done);
      clearOrbitClasses(article);
    };
    article.addEventListener("transitionend", done);
    setTimeout(() => clearOrbitClasses(article), ORBIT_MS + 100);
  }

  function setupNextLink() {
    const next = document.getElementById("project-next");
    if (!next) return;

    const href =
      next.getAttribute("href") || document.body.dataset?.next || "";
    if (!href) return;

    next.addEventListener("click", (e) => {
      if (prefersReducedMotion()) return;

      const article = getArticle();
      if (!article) return;

      e.preventDefault();
      if (article.classList.contains("orbit-nav-exit")) return;

      lockScroll();
      document.documentElement.classList.add("orbit-nav-active");
      setTransformOrigin(article);
      article.style.willChange = "transform, opacity";

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try {
          sessionStorage.setItem(STORAGE_ENTER, "1");
        } catch {
          /* ignore */
        }
        window.location.href = href;
      };

      const onEnd = (ev) => {
        if (ev.target !== article || ev.propertyName !== "transform") return;
        article.removeEventListener("transitionend", onEnd);
        finish();
      };

      requestAnimationFrame(() => {
        article.classList.add("orbit-nav-exit");
      });
      article.addEventListener("transitionend", onEnd);
      setTimeout(finish, ORBIT_MS + 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      runEnter();
      setupNextLink();
    });
  } else {
    runEnter();
    setupNextLink();
  }
})();
