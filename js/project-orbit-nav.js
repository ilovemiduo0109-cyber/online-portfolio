/**
 * Subpage ring carousel: viewport slice rotates on ring; full next page prefetched
 * in a hidden iframe. After spin, swap DOM + replaceState (no reload).
 */
(function () {
  const ORBIT_MS = 1100;
  const PREFETCH_TIMEOUT_MS = 10000;
  const CONTENT_POLL_MS = 80;

  let prefetchIframe = null;
  let prefetchHref = null;
  let prefetchObserver = null;
  let transitioning = false;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getArticle() {
    return document.querySelector(".project-page article");
  }

  function getNextHref() {
    const link = document.getElementById("project-next");
    return (
      link?.getAttribute("href") ||
      document.body.dataset?.next ||
      ""
    );
  }

  function lockScroll() {
    const y = window.scrollY;
    document.body.dataset.orbitScrollY = String(y);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
  }

  function disableScrollRestoration() {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }

  function scrollPageToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function unlockScrollToTop() {
    scrollPageToTop();
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    delete document.body.dataset.orbitScrollY;
    scrollPageToTop();
    requestAnimationFrame(() => {
      scrollPageToTop();
      requestAnimationFrame(scrollPageToTop);
    });
  }

  function absolutizeUrls(root, baseUrl) {
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    root.querySelectorAll("[src]").forEach((el) => {
      const src = el.getAttribute("src");
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      try {
        el.setAttribute("src", new URL(src, base).href);
      } catch {
        /* ignore */
      }
    });
    root.querySelectorAll("a[href]").forEach((el) => {
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      try {
        el.setAttribute("href", new URL(href, base).href);
      } catch {
        /* ignore */
      }
    });
  }

  function applyLazyBelowFold(article) {
    const imgs = article.querySelectorAll("img");
    imgs.forEach((img, index) => {
      if (index <= 1) {
        img.loading = "eager";
        img.decoding = "async";
      } else {
        img.loading = "lazy";
      }
    });
  }

  function articleHasContent(article) {
    if (!article) return false;
    const prose = article.querySelector(
      ".project-prose p, [id$='-intro'] p, .dh-prose p, .gh-prose p, .yt-prose p, .fr-prose p"
    );
    if (prose?.textContent?.trim().length > 12) return true;
    const anyP = article.querySelector("p");
    return (anyP?.textContent?.trim().length ?? 0) > 12;
  }

  function destroyPrefetch() {
    if (prefetchIframe) {
      prefetchIframe.remove();
      prefetchIframe = null;
    }
    prefetchHref = null;
  }

  function startPrefetch(href) {
    if (!href) return;
    const absolute = new URL(href, location.href).href;
    if (prefetchHref === absolute && prefetchIframe) return;

    destroyPrefetch();
    prefetchHref = absolute;

    const iframe = document.createElement("iframe");
    iframe.dataset.orbitPrefetch = "1";
    iframe.setAttribute("aria-hidden", "true");
    iframe.title = "Prefetch";
    iframe.style.cssText =
      "position:absolute;width:0;height:0;border:0;visibility:hidden;pointer-events:none";
    iframe.src = absolute;
    document.body.appendChild(iframe);
    prefetchIframe = iframe;
  }

  function waitForIframeReady(iframe) {
    return new Promise((resolve) => {
      if (!iframe) {
        resolve(false);
        return;
      }

      const started = performance.now();

      const poll = () => {
        try {
          const doc = iframe.contentDocument;
          const article = doc?.querySelector("article");
          if (articleHasContent(article)) {
            resolve(true);
            return;
          }
        } catch {
          /* cross-origin shouldn't happen */
        }

        if (performance.now() - started >= PREFETCH_TIMEOUT_MS) {
          resolve(false);
          return;
        }
        setTimeout(poll, CONTENT_POLL_MS);
      };

      if (iframe.contentDocument?.querySelector("article")) {
        poll();
      } else {
        iframe.addEventListener("load", () => poll(), { once: true });
        setTimeout(poll, CONTENT_POLL_MS);
      }
    });
  }

  async function ensurePrefetch(href) {
    const absolute = new URL(href, location.href).href;
    if (!prefetchIframe || prefetchHref !== absolute) {
      startPrefetch(href);
    }
    return waitForIframeReady(prefetchIframe);
  }

  function createSliceFromArticle(articleEl, baseForUrls) {
    const clone = articleEl.cloneNode(true);
    if (baseForUrls) absolutizeUrls(clone, baseForUrls);

    const slice = document.createElement("div");
    slice.className = "orbit-face__slice";
    slice.appendChild(clone);
    return slice;
  }

  function createFaceFromSlice(slice, yaw, extraClass) {
    const face = document.createElement("div");
    face.className = `orbit-face ${extraClass || ""}`.trim();
    face.dataset.yaw = String(yaw);

    const panel = document.createElement("div");
    panel.className = "orbit-face__panel";
    panel.appendChild(slice);
    face.appendChild(panel);
    return face;
  }

  function buildOrbitStage(currentSlice, nextSlice) {
    const viewport = document.createElement("div");
    viewport.id = "orbit-viewport";
    viewport.className = "orbit-viewport";
    viewport.setAttribute("aria-hidden", "true");

    const pivot = document.createElement("div");
    pivot.className = "orbit-pivot";

    const carousel = document.createElement("div");
    carousel.className = "orbit-carousel";
    carousel.id = "orbit-carousel";

    // Inner room: current wall yaw 0, next wall yaw -90 (right); carousel +90deg
    carousel.appendChild(createFaceFromSlice(currentSlice, 0, "orbit-face--current"));
    carousel.appendChild(createFaceFromSlice(nextSlice, -90, "orbit-face--next"));

    pivot.appendChild(carousel);
    viewport.appendChild(pivot);
    document.body.appendChild(viewport);

    return { viewport, carousel };
  }

  function syncProjectStylesheet(iframeDoc, pageBase) {
    const srcLink = iframeDoc.querySelector('link[href$="project.css"]');
    if (!srcLink) return Promise.resolve();

    const href = new URL(srcLink.getAttribute("href"), pageBase).href;
    let link = document.querySelector('link[href$="project.css"]');

    if (link?.href === href) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
      link.href = href;

      if (link.sheet) done();
      setTimeout(done, 150);
    });
  }

  function applyPageFromIframe(iframe, targetUrl) {
    const doc = iframe.contentDocument;
    const iframeBody = doc.body;
    const sourceArticle = doc.querySelector("article");
    if (!sourceArticle) throw new Error("Missing article in prefetch");

    const base = new URL(targetUrl, location.href).href;
    const imported = document.importNode(sourceArticle, true);
    absolutizeUrls(imported, base);
    applyLazyBelowFold(imported);

    const oldArticle = getArticle();
    oldArticle?.remove();

    const meteor = document.getElementById("meteor-layer");
    if (meteor?.parentNode) {
      meteor.parentNode.insertBefore(imported, meteor.nextSibling);
    } else {
      document.body.appendChild(imported);
    }

    document.body.className = iframeBody.className;
    if (iframeBody.dataset.text !== undefined) {
      document.body.dataset.text = iframeBody.dataset.text;
    }
    if (iframeBody.dataset.next !== undefined) {
      document.body.dataset.next = iframeBody.dataset.next;
    }
    document.title = doc.title;

    disableScrollRestoration();
    history.replaceState({ orbitPage: true }, "", base);
    syncProjectStylesheet(doc, base);
    scrollPageToTop();
  }

  function teardownOrbit(viewport) {
    document.documentElement.classList.remove("orbit-nav-active");
    viewport?.remove();
  }

  function setupPrefetchObserver() {
    const target =
      document.getElementById("project-next") ||
      document.querySelector(".dh-footer-nav, .gh-footer-nav, .yt-footer-nav, .fr-footer-nav");

    const href = getNextHref();
    if (!target || !href) return;

    prefetchObserver?.disconnect();
    prefetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) startPrefetch(href);
      },
      { rootMargin: "160px 0px" }
    );
    prefetchObserver.observe(target);
  }

  function runCarouselSpin(carousel) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        carousel.removeEventListener("transitionend", onEnd);
        resolve();
      };

      const onEnd = (ev) => {
        if (ev.target !== carousel || ev.propertyName !== "transform") return;
        finish();
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carousel.classList.add("orbit-carousel--spin");
        });
      });

      carousel.addEventListener("transitionend", onEnd);
      setTimeout(finish, ORBIT_MS + 120);
    });
  }

  async function startCarouselTransition(nextHref) {
    if (transitioning) return;
    const article = getArticle();
    if (!article || document.getElementById("orbit-viewport")) return;

    const targetUrl = new URL(nextHref, location.href).href;
    transitioning = true;

    try {
      const ready = await ensurePrefetch(nextHref);
      const iframe = prefetchIframe;
      const nextArticle = iframe?.contentDocument?.querySelector("article");

      if (!ready || !nextArticle) {
        window.location.href = targetUrl;
        return;
      }

      disableScrollRestoration();
      lockScroll();
      document.documentElement.classList.add("orbit-nav-active");

      await syncProjectStylesheet(iframe.contentDocument, targetUrl);

      const currentSlice = createSliceFromArticle(article, location.href);
      const nextSlice = createSliceFromArticle(nextArticle, targetUrl);

      const { viewport, carousel } = buildOrbitStage(currentSlice, nextSlice);

      await runCarouselSpin(carousel);

      applyPageFromIframe(iframe, targetUrl);
      teardownOrbit(viewport);
      unlockScrollToTop();
      destroyPrefetch();

      const following = getNextHref();
      if (following) startPrefetch(following);
      setupPrefetchObserver();
    } catch {
      window.location.href = targetUrl;
    } finally {
      transitioning = false;
    }
  }

  function onDocumentClick(e) {
    const next = e.target.closest("#project-next");
    if (!next) return;

    const href = next.getAttribute("href") || document.body.dataset?.next || "";
    if (!href) return;

    if (prefersReducedMotion()) return;

    e.preventDefault();
    startCarouselTransition(href);
  }

  function init() {
    if (window.frameElement?.dataset?.orbitPrefetch) return;
    if (!document.body.classList.contains("project-page")) return;
    disableScrollRestoration();
    document.addEventListener("click", onDocumentClick);
    setupPrefetchObserver();
    const href = getNextHref();
    if (href) startPrefetch(href);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
