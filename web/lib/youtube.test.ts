import { describe, expect, it } from "vitest";
import { accountCta } from "./landing-cta";
import { DEMO_VIDEO, EXPLAINER_VIDEO, youtubeEmbedUrl } from "./youtube";

describe("youtubeEmbedUrl", () => {
  it("uses the no-cookie host with autoplay", () => {
    for (const v of [DEMO_VIDEO, EXPLAINER_VIDEO]) {
      const u = new URL(youtubeEmbedUrl(v.id)!);
      expect(u.origin).toBe("https://www.youtube-nocookie.com");
      expect(u.pathname).toBe(`/embed/${v.id}`);
      expect(u.searchParams.get("autoplay")).toBe("1");
    }
  });
  it("rejects malformed ids", () => {
    expect(youtubeEmbedUrl("x/../y")).toBeNull();
    expect(youtubeEmbedUrl("")).toBeNull();
  });
});

describe("accountCta", () => {
  it("defaults to sign up and swaps to the app when signed in", () => {
    expect(accountCta("loading").href).toBe("/signup");
    expect(accountCta("out").label).toBe("Create account");
    expect(accountCta("in")).toEqual({ href: "/app", label: "Open the app" });
  });
});
