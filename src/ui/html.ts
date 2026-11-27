// turns text into safe HTML: every view builds its markup with this.
// It is also safe inside a quoted attribute such as title="...".

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
