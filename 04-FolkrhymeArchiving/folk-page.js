/**
 * Folk Rhyme 04 — loads text-content.txt into layout slots (Figma order).
 *
 * Prose slots (blank-line paragraphs, skips applied):
 *   [0] #fr-intro
 *   [1] #fr-split-text
 *   [2+] #fr-mid1
 */
(async function () {
  const body = document.body;
  const textUrl = body.dataset.text;
  const nextHref = body.dataset.next;
  const nextLink = document.getElementById("project-next");
  if (nextLink && nextHref) nextLink.href = nextHref;

  const slots = {
    intro: document.getElementById("fr-intro"),
    split: document.getElementById("fr-split-text"),
    mid1: document.getElementById("fr-mid1"),
  };

  if (!textUrl || !slots.intro) return;

  const render = (el, paragraphs) => {
    if (!el) return;
    el.innerHTML = paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("");
  };

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeQuotes(str) {
    return str.replace(/[\u2018\u2019\u201C\u201D]/g, "'");
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

    const skipLine = (trimmed) => {
      const norm = normalizeQuotes(trimmed);
      if (/^the ['']?xunyao['']? folk rhyme archiving initiative$/i.test(norm)) return true;
      if (/^live performance for villagers$/i.test(norm)) return true;
      if (/^field recording excerpt/i.test(norm)) return true;
      if (/^https?:\/\//i.test(norm)) return true;
      if (/youtu\.?be/i.test(norm)) return true;
      if (/click to (see|view) (my |the )?next project/i.test(norm)) return true;
      return false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flush();
        return;
      }
      if (skipLine(trimmed)) return;
      buffer.push(trimmed);
    });
    flush();
    return paragraphs;
  }

  try {
    const res = await fetch(textUrl);
    if (!res.ok) throw new Error(res.statusText);
    const paragraphs = parseParagraphs(await res.text());

    render(slots.intro, paragraphs.slice(0, 1));
    render(slots.split, paragraphs.slice(1, 2));
    render(slots.mid1, paragraphs.slice(2));
  } catch {
    slots.intro.innerHTML = "<p>Content could not be loaded.</p>";
  }
})();
