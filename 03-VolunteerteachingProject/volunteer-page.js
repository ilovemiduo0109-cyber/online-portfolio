/**
 * Yunnan 03 — loads text-content.txt into layout slots (Figma order).
 *
 * Prose slots (blank-line paragraphs, poem excluded):
 *   [0] #yt-intro
 *   [1] #yt-mid1
 *   [2–3] #yt-mid2
 *   [4] #yt-mid3
 *   [5+] #yt-final
 */
(async function () {
  const body = document.body;
  const textUrl = body.dataset.text;
  const nextHref = body.dataset.next;
  const nextLink = document.getElementById("project-next");
  if (nextLink && nextHref) nextLink.href = nextHref;

  const slots = {
    intro: document.getElementById("yt-intro"),
    mid1: document.getElementById("yt-mid1"),
    mid2: document.getElementById("yt-mid2"),
    poem: document.getElementById("yt-poem"),
    mid3: document.getElementById("yt-mid3"),
    final: document.getElementById("yt-final"),
  };

  if (!textUrl || !slots.intro) return;

  const POEM_TITLE =
    /^THE (?:CARVING (?:INCANTATION|INSCRIPTION)|RITU(?:R)?AL POETRY)$/i;

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

  function parseContent(raw) {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const prose = [];
    let poemTitle = "";
    const poemLines = [];
    let buffer = [];
    let mode = "prose";

    const flushProse = () => {
      if (buffer.length) {
        prose.push(buffer.join(" "));
        buffer = [];
      }
    };

    const skipLine = (trimmed) => {
      const norm = normalizeQuotes(trimmed);
      if (/^yunnan border aesthetic education$/i.test(norm)) return true;
      if (/^'across the wheat field':?$/i.test(norm)) return true;
      if (/^data & memory on the border$/i.test(norm)) return true;
      if (/click to (see|view) (my |the )?next project/i.test(norm)) return true;
      return false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (mode === "poem" && poemLines.length > 0) mode = "prose";
        else if (mode !== "poem") flushProse();
        return;
      }
      if (skipLine(trimmed)) return;

      if (POEM_TITLE.test(trimmed)) {
        flushProse();
        poemTitle = trimmed;
        mode = "poem";
        return;
      }

      if (mode === "poem") {
        poemLines.push(trimmed);
        return;
      }

      buffer.push(trimmed);
    });

    flushProse();
    return { prose, poemTitle, poemLines };
  }

  function renderPoem(el, title, lines) {
    if (!el) return;
    if (!lines.length) {
      el.innerHTML = "";
      return;
    }
    const heading = title
      ? `<p class="yt-poem__title">${escapeHtml(title)}</p>`
      : "";
    const bodyHtml = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    el.innerHTML = `${heading}<div class="yt-poem__body">${bodyHtml}</div>`;
  }

  try {
    const res = await fetch(textUrl);
    if (!res.ok) throw new Error(res.statusText);
    const { prose, poemTitle, poemLines } = parseContent(await res.text());

    render(slots.intro, prose.slice(0, 1));
    render(slots.mid1, prose.slice(1, 2));
    render(slots.mid2, prose.slice(2, 4));
    renderPoem(slots.poem, poemTitle, poemLines);
    render(slots.mid3, prose.slice(4, 5));
    render(slots.final, prose.slice(5));
  } catch {
    slots.intro.innerHTML = "<p>Content could not be loaded.</p>";
  }
})();
