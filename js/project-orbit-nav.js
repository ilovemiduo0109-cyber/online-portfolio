/**
 * Subpage ring carousel: revolution around the viewer; bg + meteors fixed.
 * Both faces show title + hero + first paragraph only (no preview card chrome).
 */
(function () {
  const ORBIT_MS = 1100;
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
        "This project is a 1:1 scale replica of a Qing Dynasty gatehouse discovered during our fieldwork in a Beijing hutong.",
    },
    {
      slug: "03-VolunteerteachingProject",
      href: "../04-FolkrhymeArchiving/",
      title: "'Across the Wheat Field': Data & Memory on the Border",
      image: "hero.JPG",
      blurb:
        "For the past four years, I deeply engaged in an arts education initiative along the China-Myanmar border.",
    },
    {
      slug: "04-FolkrhymeArchiving",
      href: "../01-DunhuangReplication/",
      title: "The 'Xunyao' Folk Rhyme Archiving Initiative",
      image: "hero.jpg",
      blurb:
        "As a field researcher and photographer for \"The Folk Song Rescuing Project\", I documented the vanishing oral nursery rhymes of the elder generation.",
    },
  ];

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getArticle() {
    return document.querySelector(".project-page article");
  }

  function currentSlug() {
    return (
      ORBIT_PROJECTS.find((p) => location.pathname.includes(p.slug))?.slug ??
      null
    );
  }

  function projectBySlug(slug) {
    return ORBIT_PROJECTS.find((p) => p.slug === slug) ?? null;
  }

  function findProjectForNextHref(nextHref) {
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

  /** @returns {{ title: string; image: string; blurb: string }} */
  function extractTeaserFromArticle(article) {
    const h1 = article.querySelector("header h1");
    let title = "";
    if (h1) {
      const lines = h1.querySelectorAll(
        '[class*="title-line"], [class*="Title-line"]'
      );
      title = lines.length
        ? Array.from(lines)
            .map((el) => el.textContent.trim())
            .filter(Boolean)
            .join(" ")
        : h1.textContent.replace(/\s+/g, " ").trim();
    }

    const imgEl = article.querySelector(
      ".project-stack__media img, .project-stack figure img, header + * img, figure img"
    );
    let image = "";
    if (imgEl?.getAttribute("src")) {
      image = new URL(imgEl.getAttribute("src"), location.href).href;
    }

    const para =
      article.querySelector("[id$='-intro'] p") ??
      article.querySelector(".project-prose p") ??
      article.querySelector("header ~ * p");
    const blurb = para?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    return { title, image, blurb };
  }

  /** @returns {{ title: string; image: string; blurb: string; imageIsAbsolute?: boolean }} */
  function resolveCurrentTeaser(article) {
    const fromDom = extractTeaserFromArticle(article);
    const fallback = projectBySlug(currentSlug());
    const base = location.href;

    const title = fromDom.title || fallback?.title || "";
    let image = fromDom.image;
    let imageIsAbsolute = !!fromDom.image;
    if (!image && fallback?.image) {
      image = new URL(fallback.image, base).href;
      imageIsAbsolute = true;
    }
    const blurb = fromDom.blurb || fallback?.blurb || "";

    return { title, image, blurb, imageIsAbsolute: true };
  }

  /** @param {{ title: string; image: string; blurb: string; base?: string }} data */
  function resolveNextTeaser(data) {
    const img =
      data.image.startsWith("http") || data.image.startsWith("/")
        ? data.image
        : new URL(data.image, data.base).href;
    return { title: data.title, image: img, blurb: data.blurb };
  }

  function createTeaserFace(teaser, yaw, extraClass) {
    const face = document.createElement("div");
    face.className = `orbit-face ${extraClass || ""}`.trim();
    face.dataset.yaw = String(yaw);

    const panel = document.createElement("div");
    panel.className = "orbit-face__panel";

    const imgHtml = teaser.image
      ? `<figure class="orbit-teaser__media">
          <img src="${escapeHtml(teaser.image)}" alt="${escapeHtml(teaser.title)}" width="640" height="480" loading="eager" decoding="async" />
        </figure>`
      : "";

    panel.innerHTML = `
      <div class="orbit-teaser">
        <h2 class="orbit-teaser__title">${escapeHtml(teaser.title)}</h2>
        ${imgHtml}
        <p class="orbit-teaser__blurb">${escapeHtml(teaser.blurb)}</p>
      </div>`;

    face.appendChild(panel);
    return face;
  }

  function buildOrbitStage(currentTeaser, nextTeaser) {
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

    carousel.appendChild(
      createTeaserFace(currentTeaser, 0, "orbit-face--current")
    );
    carousel.appendChild(createTeaserFace(nextTeaser, -90, "orbit-face--next"));

    pivot.appendChild(carousel);
    viewport.appendChild(pivot);
    document.body.appendChild(viewport);

    return { carousel };
  }

  function startCarouselTransition(nextHref) {
    const article = getArticle();
    if (!article || document.getElementById("orbit-viewport")) return;

    const nextProject = findProjectForNextHref(nextHref);
    if (!nextProject) {
      window.location.href = nextHref;
      return;
    }

    const currentTeaser = resolveCurrentTeaser(article);
    const nextTeaser = resolveNextTeaser(nextProject);

    if (!currentTeaser.title || !nextTeaser.title) {
      window.location.href = nextHref;
      return;
    }

    lockScroll();
    document.documentElement.classList.add("orbit-nav-active");

    const { carousel } = buildOrbitStage(currentTeaser, nextTeaser);

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
