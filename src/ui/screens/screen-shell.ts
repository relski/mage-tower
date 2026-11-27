// the shared frame of the pick, reward and shop screens: like the stage screen, they fit the
// screen height. A fixed top, a middle that scrolls (and keeps its place when the markup is
// replaced, through its scroll key), and optionally buttons pinned at the bottom.
// See ui/styles/stage-layout.css.

export type ScreenParts = {
  top: string,
  body: string,
  scrollKey: string, // names what the body shows; its scroll position is kept only while this stays the same
  actions?: string,
};

export function screenShell(parts: ScreenParts): string {
  const actions =
    parts.actions !== undefined ? `<div class="screen-actions">${parts.actions}</div>` : "";

  return `
    <div class="screen">
      <div class="screen-top">${parts.top}</div>
      <div class="screen-body" id="screen-body" data-scroll-key="${parts.scrollKey}">${parts.body}</div>
      ${actions}
    </div>`;
}
