/**
 * Gatehouse 02 — loads text-content.txt into layout slots (Figma order).
 */
(async function () {
  const body = document.body;
  const textUrl = body.dataset.text;
  const nextHref = body.dataset.next;
  const nextLink = document.getElementById("project-next");
  if (nextLink && nextHref) nextLink.href = nextHref;

  const slots = {
    intro: document.getElementById("gh-intro"),
    mid1: document.getElementById("gh-mid1"),
    mid2: document.getElementById("gh-mid2"),
    final: document.getElementById("gh-final"),
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
      if (/^1:1 scale replication:?$/i.test(trimmed)) return true;
      if (/^the beijing siheyuan gatehouse$/i.test(trimmed)) return true;
      if (/^siheyuan gatehouse restoration$/i.test(trimmed)) return true;
      if (/click to (see|view) (my |the )?next project/i.test(trimmed)) return true;
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
    render(slots.mid1, paragraphs.slice(1, 2));
    render(slots.mid2, paragraphs.slice(2, 3));
    render(slots.final, paragraphs.slice(3));
  } catch {
    slots.intro.innerHTML = "<p>Content could not be loaded.</p>";
  }
})();
