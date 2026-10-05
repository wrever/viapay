/* Copies the logo set into each app's public/brand so Next can serve it.
   packages/brand/logos is the source of truth: edit there, run `pnpm brand:sync`,
   never hand-edit the copies. */

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "..", "logos");
const repo = resolve(here, "..", "..", "..");
const apps = ["web", "dashboard", "checkout"];

const logos = (await readdir(source)).filter((name) => name.endsWith(".svg")).sort();
if (logos.length === 0) throw new Error(`No svg found in ${source}`);

for (const app of apps) {
  const target = join(repo, "apps", app, "public", "brand");
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const logo of logos) {
    await cp(join(source, logo), join(target, logo));
  }
  console.log(`${app}/public/brand ← ${logos.length} svg`);
}
