/**
 * Loads text-content.txt into project subpages; links "next project" footer.
 */
(async function () {
  const body = document.body;
  const textUrl = body.dataset.text;
  const nextHref = body.dataset.next;
  const container = document.getElementById("project-text");
  if (!container) return;

  const nextLink = document.getElementById("project-next");
  if (nextLink && nextHref) nextLink.href = nextHref;

  if (!textUrl) return;

  try {
    const res = await fetch(textUrl);
    if (!res.ok) throw new Error(res.statusText);
    const raw = await res.text();
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const parts = [];
    let buffer = [];

    const flush = () => {
      if (buffer.length) {
        parts.push(`<p>${buffer.join(" ")}</p>`);
        buffer = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flush();
        return;
      }
      if (/click to see my next project/i.test(trimmed)) return;
      buffer.push(trimmed);
    });
    flush();

    container.innerHTML = parts.join("");
  } catch {
    container.innerHTML = "<p>Content could not be loaded.</p>";
  }
})();
