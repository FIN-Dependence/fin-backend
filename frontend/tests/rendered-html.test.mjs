import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the FINDEPENDENCE application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>FINDEPENDENCE \| 첫 독립 금융 AI<\/title>/i);
  assert.match(html, /나의 독립 준비 상담/);
  assert.match(html, /금융환경 설문/);
  assert.match(html, /FINDEPENDENCE AI/);
});

test("keeps the Java API integration in the client application", async () => {
  const [app, api] = await Promise.all([
    readFile(new URL("../app/FinDependenceApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /loadRemoteProfile/);
  assert.match(app, /saveRemoteProfile/);
  assert.match(app, /sendChat/);
  assert.match(api, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(api, /\/api\/profiles\//);
  assert.match(api, /\/api\/chat/);
});
