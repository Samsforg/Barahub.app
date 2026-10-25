import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(relativePath: string) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

describe("Barahub PWA contract", () => {
  it("declares an installable French manifest with a scoped start URL", async () => {
    const manifest = JSON.parse(await readProjectFile("public/manifest.webmanifest")) as { lang: string; start_url: string; scope: string; display: string; icons: Array<{ src: string; sizes: string }> };
    expect(manifest.lang).toBe("fr-CI");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon) => icon.sizes === "1024x1024")).toBe(true);
  });

  it("keeps private API and application routes outside the service-worker cache", async () => {
    const worker = await readProjectFile("public/sw.js");
    expect(worker).toContain("url.pathname.startsWith(\"/api/\")");
    expect(worker).toContain("url.pathname.startsWith(\"/_expo/static/\")");
    expect(worker).not.toContain("caches.addAll([\"/admin\"");
    expect(worker).not.toContain("caches.addAll([\"/requests\"");
    expect(worker).not.toContain("caches.addAll([\"/provider\"");
  });

  it("declares only absolute, route-shaped entries for Webdev discovery", async () => {
    const manifest = JSON.parse(await readProjectFile("public/manus-routes.json")) as { routes: Array<{ path: string }> };
    expect(manifest.routes.length).toBeGreaterThan(0);
    expect(manifest.routes.every((route) => route.path.startsWith("/") && !route.path.includes("//"))).toBe(true);
  });
});
