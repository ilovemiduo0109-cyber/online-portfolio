/**
 * Subpage ring carousel: camera-centered revolution with next-project preview card.
 * Background + meteors stay fixed; full article + preview orbit together.
 */
(function () {
  const ORBIT_MS = 900;
  const ORIGIN_V = 0.42;

  /** @type {{ slug: string; href: string; title: string; image: string; blurb: string }[]} */
  const ORBIT_PROJECTS = [
    {
      slug: "01-DunhuangReplication",
      href: "../02-GatehouseReplication/",
      title: "Visual Replication of Dunhuang Cave 285 Ceiling",
      image: "hero.jpg",
      blurb:
        "Physical replication is more than just making a copy; it is a rigorous method of close observation to understand how ancient craftsmen structured their work.",
    },
    {
      slug: "02-GatehouseReplication",
      href: "../03-VolunteerteachingProject/",
      title: "1:1 Scale Replication: The Beijing Siheyuan Gatehouse",
      image: "exhi-preview.jpg",
      blurb:
        "A 1:1 scale replica of a Qing Dynasty gatehouse—four months of fieldwork, stagecraft materials, and intensive craftsmanship toward historical detail.",
    },
    {
      slug: "03-VolunteerteachingProject",
      href: "../04-FolkrhymeArchiving/",
      title: "'Across the Wheat Field': Data & Memory on the Border",
      image: "hero.JPG",
      blurb:
        "Arts education and longitudinal fieldwork along the China–Myanmar border—summer camps and home-visit archiving of individual children.",
    },
    {
      slug: "04-FolkrhymeArchiving",
      href: "../01-DunhuangReplication/",
      title: "The 'Xunyao' Folk Rhyme Archiving Initiative",
      image: "hero.jpg",
      blurb:
        "Field recording for vanishing oral nursery rhymes—sonic excavation before living memory falls silent.",
    },
  ];

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getArticle() {
    return document.querySelector(".project-page article");
  }

  function findPreviewForHref(nextHref) {
    const target = new URL(nextHref, location.href);
    const hit = ORBIT_PROJECTS.find((p) => target.pathname.includes(p.slug));
    if (!hit) return null;
    const base = target.href.endsWith("/") ? target.href : `${target.href}/`;
    return { ...hit, base };
  }

  function lockScroll() {
    const y = window.scrollY;
    document.body.dataset.orbitScrollY = String(y);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function createPreviewFace(preview, baseUrl) {
    const face = document.createElement("div");
    face.className = "orbit-face";
    face.dataset.yaw = "90";

    const panel = document.createElement("div");
    panel.className = "orbit-face__panel orbit-face__panel--preview";

    const imgSrc = new URL(preview.image, baseUrl).href;
    panel.innerHTML = `
      <div class="orbit-preview">
        <h2 class="orbit-preview__title">${escapeHtml(preview.title)}</h2>
        <figure class="orbit-preview__media">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(preview.title)}" width="640" height="480" loading="eager" decoding="async" />
        </figure>
        <p class="orbit-preview__blurb">${escapeHtml(preview.blurb)}</p>
      </div>`;

    face.appendChild(panel);
    return face;
  }

  function buildOrbitStage(article) {
    const viewport = document.createElement("div");
    viewport.id = "orbit-viewport";
    viewport.className = "orbit-viewport";
    viewport.setAttribute("aria-hidden", "true");

    const pivot = document.createElement("div");
    pivot.className = "orbit-pivot";
    pivot.style.top = `${ORIGIN_V * 100}vh`;

    const carousel = document.createElement("div");
    carousel.className = "orbit-carousel";
    carousel.id = "orbit-carousel";

    const face0 = document.createElement("div");
    face0.className = "orbit-face orbit-face--current";
    face0.dataset.yaw = "0";

    const panel0 = document.createElement("div");
    panel0.className = "orbit-face__panel orbit-face__panel--live";
    panel0.appendChild(article);

    face0.appendChild(panel0);
    carousel.appendChild(face0);
    pivot.appendChild(carousel);
    viewport.appendChild(pivot);
    document.body.appendChild(viewport);

    return { viewport, carousel };
  }

  function startCarouselTransition(nextHref) {
    const article = getArticle();
    if (!article || article.closest("#orbit-viewport")) return;

    const preview = findPreviewForHref(nextHref);
    if (!preview) {
      window.location.href = nextHref;
      return;
    }

    lockScroll();
    document.documentElement.classList.add("orbit-nav-active");

    const { carousel } = buildOrbitStage(article);
    const previewFace = createPreviewFace(preview, preview.base);
    carousel.appendChild(previewFace);

    const targetUrl = new URL(nextHref, location.href).href;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.location.replace(targetUrl);
    };

    const onEnd = (ev) => {
      if (ev.target !== carousel || ev.propertyName !== "transform") return;
      carousel.removeEventListener("transitionend", onEnd);
      finish();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        carousel.classList.add("orbit-carousel--spin");
      });
    });

    carousel.addEventListener("transitionend", onEnd);
    setTimeout(finish, ORBIT_MS + 120);
  }

  function setupNextLink() {
    const next = document.getElementById("project-next");
    if (!next) return;

    const href =
      next.getAttribute("href") || document.body.dataset?.next || "";
    if (!href) return;

    next.addEventListener("click", (e) => {
      if (prefersReducedMotion()) return;
      e.preventDefault();
      if (document.getElementById("orbit-viewport")) return;
      startCarouselTransition(href);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNextLink);
  } else {
    setupNextLink();
  }
})();
