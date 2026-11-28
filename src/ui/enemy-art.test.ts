import { describe, expect, it } from "vitest";
import { enemyArt } from "./enemy-art";

describe("enemyArt", () => {
  it.each(["Goblin Scout", "Stone Golem", "Tower Warden"])(
    "renders the imported image for %s",
    (name) => {
      expect(enemyArt(name)).toMatch(/^<img src="[^"]+" alt="" \/>$/);
    },
  );

  it("uses the generic SVG for an unknown enemy", () => {
    expect(enemyArt("Unknown Enemy")).toContain("<svg ");
    expect(enemyArt("Unknown Enemy")).toContain("</svg>");
  });
});
