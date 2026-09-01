// Node 22+. Run against a LOCAL test server (prefer DATABASE_URL=jdbc:h2:mem:auth-smoke).
// Creates synthetic accounts; does not use or print real credentials.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.argv[2] || "http://localhost:8080";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local test server only");
const password = `${randomUUID()}!Aa1`;
const profile = { name: "Auth Test A", age: 26, employment: "첫 취업 · 정규직", monthlyIncome: 2450000,
  housingType: "월세", monthlyRent: 650000, maintenance: 80000, debtPayment: 140000 };
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }
class Client {
  cookies = new Map();
  async request(path, method = "GET", body, secure = true, headers = {}) {
    if (method !== "GET" && secure) {
      const csrf = await this.request("/api/auth/csrf");
      assert.equal(csrf.status, 200);
      headers[csrf.body.headerName] = csrf.body.token;
    }
    const response = await fetch(`${base}${path}`, { method, headers: {
      "Content-Type": "application/json", Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...headers,
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const value of response.headers.getSetCookie()) {
      const [name, ...parts] = value.split(";")[0].split("=");
      if (value.includes("Max-Age=0")) this.cookies.delete(name); else this.cookies.set(name, parts.join("="));
    }
    const raw = await response.text();
    return { status: response.status, body: raw ? JSON.parse(raw) : null, headers: response.headers };
  }
  register(email) { return this.request("/api/auth/register", "POST", { email, password, confirmPassword: password, displayName: "Test User" }); }
}
const a = new Client(), b = new Client(), anon = new Client();
check((await anon.request("/api/profiles/me")).status === 401, "anonymous access blocked");
check((await anon.request("/api/auth/login", "POST", {}, false)).status === 403, "CSRF required before login");
check((await anon.request("/api/auth/register", "POST", { email: "invalid", displayName: "A", password: "short", confirmPassword: "other" })).status === 400, "registration validation");
const emailA = `auth-test-${randomUUID()}@example.test`, emailB = `auth-test-${randomUUID()}@example.test`;
const regA = await a.register(emailA), regB = await b.register(emailB);
check(regA.status === 201 && regB.status === 201, "two independent accounts created");
check(regA.headers.getSetCookie().some(v => v.startsWith("FIN_SESSION=") && v.includes("HttpOnly") && v.includes("SameSite=Lax")), "HttpOnly JWT cookie");
check(!JSON.stringify(regA.body).includes(password) && !regA.body.passwordHash, "no password returned");
check((await anon.register(emailA.toUpperCase())).status === 409, "duplicate email rejected");
check((await anon.request("/api/auth/login", "POST", { email: emailA, password: "wrong-password" })).status === 401, "wrong password rejected");
check((await a.request("/api/profiles/me", "PUT", { ...profile, monthlyIncome: -1 })).status === 400, "negative survey amount rejected");
check((await a.request("/api/profiles/me", "PUT", { ...profile, age: 26.7 })).status === 400, "fractional age rejected");
check((await a.request("/api/profiles/me", "PUT", profile)).status === 200, "survey saved");
check((await a.request("/api/profiles/me")).body.monthlyIncome === 2450000, "own survey restored");
check((await b.request("/api/profiles/me")).status === 404, "other account starts without survey");
check((await b.request(`/api/profiles/${regA.body.id}`)).status >= 400, "old clientId route cannot expose another survey");
check((await b.request("/api/profiles/me", "PUT", { ...profile, name: "Auth Test B", monthlyIncome: 1900000 })).status === 200, "second account survey saved");
check((await a.request("/api/profiles/me")).body.monthlyIncome === 2450000, "second account cannot overwrite first survey");
const answer = await a.request("/api/chat", "POST", { clientId: regB.body.id, message: "독립 가능할까?" });
check(answer.status === 200 && answer.body.answer.includes("Auth Test A"), "chat ignores spoofed clientId");
check((await b.request("/api/chat/history")).body.length === 0, "chat history isolated");
check((await a.request("/api/chat/history")).body.length === 2, "own chat history restored");
const originalToken = a.cookies.get("FIN_SESSION");
const forged = new Client();
forged.cookies.set("FIN_SESSION", originalToken.split(".").slice(0, 2).join(".") + "." + "A".repeat(43));
check((await forged.request("/api/auth/me")).status === 401, "tampered JWT rejected");
check((await a.request("/api/auth/logout", "POST")).status === 204, "logout succeeds");
const replay = new Client(); replay.cookies.set("FIN_SESSION", originalToken);
check((await replay.request("/api/auth/me")).status === 401, "logged-out JWT cannot be replayed");
check((await a.request("/api/auth/login", "POST", { email: emailA, password })).status === 200, "correct credentials restore login");
check((await a.request("/api/profiles/me")).body.monthlyIncome === 2450000, "survey persists across login");
await a.request("/api/auth/logout", "POST"); await b.request("/api/auth/logout", "POST");
console.log(`\n${checks} authentication checks passed.`);
