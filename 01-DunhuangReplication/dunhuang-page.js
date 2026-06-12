/**
 * Dunhuang 01 — loads text-content.txt into layout slots (Figma order).
 */
(async function () {
  const CONTENT_VERSION = "16";

  const body = document.body;
  const textUrl = body.dataset.text;
  const nextHref = body.dataset.next;
  const nextLink = document.getElementById("project-next");
  if (nextLink && nextHref) nextLink.href = nextHref;

  const slots = {
    intro: document.getElementById("dh-intro"),
    mid1: document.getElementById("dh-mid1"),
    mid2: document.getElementById("dh-mid2"),
    split: document.getElementById("dh-split-text"),
    exhiLead: document.getElementById("dh-exhi-lead"),
    final: document.getElementById("dh-final"),
  };

  if (!textUrl || !slots.intro) return;

  const render = (el, paragraphs) => {
    if (!el) return;
    el.innerHTML = paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("");
  };

  const renderMural = (el, text) => {
    if (!el || !text) return;
    el.innerHTML = `<p class="dh-mural-text">${escapeHtml(text)}</p>`;
  };

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseParagraphs(raw) {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const paragraphs = [];
    let buffer = [];

    const flush = () => {
      if (buffer.length) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flush();
        return;
      }
      if (/^visual replication of$/i.test(trimmed)) return;
      if (/^dunhuang cave 285 ceiling$/i.test(trimmed)) return;
      if (/click to see my next project/i.test(trimmed)) return;
      buffer.push(trimmed);
    });
    flush();
    return paragraphs;
  }

  function findParagraph(paragraphs, pattern) {
    return paragraphs.find((p) => pattern.test(p)) ?? null;
  }

  function textUrlWithVersion(url) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${CONTENT_VERSION}`;
  }

  try {
    const res = await fetch(textUrlWithVersion(textUrl));
    if (!res.ok) throw new Error(res.statusText);
    const paragraphs = parseParagraphs(await res.text());

    render(slots.intro, paragraphs.slice(0, 1));
    render(slots.mid1, paragraphs.slice(1, 2));
    render(slots.mid2, paragraphs.slice(2, 3));
    renderMural(slots.split, findParagraph(paragraphs, /^The transcendence of/i));
    render(slots.exhiLead, paragraphs.slice(-2, -1));
    render(slots.final, paragraphs.slice(-1));
  } catch {
    slots.intro.innerHTML = "<p>Content could not be loaded.</p>";
  }
})();
