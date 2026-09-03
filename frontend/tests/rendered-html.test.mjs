import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build emits the FINDEPENDENCE application shell", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>FINDEPENDENCE \| 첫 독립 금융 AI<\/title>/i);
  assert.match(html, /id="root"/);
});

test("keeps the Java API integration in the client application", async () => {
  const [app, api] = await Promise.all([
    readFile(new URL("../app/FinDependenceApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /loadRemoteProfiles/);
  assert.match(app, /saveRemoteProfile/);
  assert.match(app, /sendChat/);
  assert.match(app, /가계부/);
  assert.match(app, /환경 비교/);
  assert.match(app, /environments\.length >= 5/);
  assert.match(api, /VITE_API_BASE_URL/);
  assert.match(api, /\/api\/profiles\//);
  assert.match(api, /\/api\/chat/);
  assert.match(api, /credentials: "include"/);
  assert.doesNotMatch(api, /localStorage\.(getItem|setItem)/);
  assert.doesNotMatch(app, /localStorage\.(getItem|setItem)/);
  assert.match(api, /environmentId/);
  assert.doesNotMatch(api, /JSON.stringify\(\{ clientId/);
});
