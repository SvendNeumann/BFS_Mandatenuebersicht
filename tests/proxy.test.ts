import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Cookie = { name: string; value: string };
class CookieJar {
  values = new Map<string, Cookie>();
  get(name: string) { return this.values.get(name); }
  getAll() { return [...this.values.values()]; }
  set(name: string | Cookie, value?: string) {
    const cookie = typeof name === "string" ? { name, value: value ?? "" } : name;
    this.values.set(cookie.name, cookie);
  }
}
class FakeResponse {
  cookies = new CookieJar();
  location?: string;
  constructor(location?: string) { this.location = location; }
  static next() { return new FakeResponse(); }
  static redirect(url: URL) { return new FakeResponse(url.href); }
}

function setup(role = "super_admin", mustChangePassword = false) {
  let authCalls = 0;
  const client = {
    auth: {
      getUser: async () => { authCalls++; return { data: { user: { id: "test-user" } } }; },
      refreshSession: async () => ({ data: { user: { id: "test-user" }, session: { access_token: "new-access", refresh_token: "new-refresh" } } })
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, active: true, must_change_password: mustChangePassword } }) }) }) })
  };
  const exports: { proxy?: (request: unknown) => Promise<FakeResponse> } = {};
  const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: FakeResponse };
      if (name === "@supabase/supabase-js") return { createClient: () => client };
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test", NODE_ENV: "production" } }
  });
  return {
    run: async (path: string, token: "access" | "refresh" | "none" = "access") => {
      const url = new URL(path, "https://bfs.invalid");
      const cookies = new CookieJar();
      if (token !== "none") cookies.set(`orisus_bfs_${token}_token`, "test");
      return exports.proxy!({ nextUrl: Object.assign(url, { clone: () => new URL(url) }), cookies });
    },
    authCalls: () => authCalls
  };
}

test("Passwort-Recovery-Formular ist ohne Cookie erreichbar; API bleibt separat geschuetzt", async () => {
  const app = setup();
  assert.equal((await app.run("/passwort-aendern?reset=1", "none")).location, undefined);
  assert.equal(app.authCalls(), 0);
  assert.match((await app.run("/dashboard", "none")).location ?? "", /\/login/);
});

test("Standortleitung kann keine gruppenweiten oder administrativen Seiten oeffnen", async () => {
  const app = setup("standortleitung");
  for (const path of ["/dashboard", "/importe", "/nutzer", "/standorte"]) {
    assert.match((await app.run(path)).location ?? "", /\/login/);
  }
  assert.equal((await app.run("/standort/dashboard")).location, undefined);
});

test("Abrechnungsmanagement darf importieren, aber keine Nutzerverwaltung oeffnen", async () => {
  const app = setup("abrechnungsmanagement");
  assert.equal((await app.run("/importe")).location, undefined);
  assert.equal((await app.run("/dashboard")).location, undefined);
  assert.match((await app.run("/nutzer")).location ?? "", /\/login/);
});

test("Erzwungener Passwortwechsel behaelt erneuerte Session-Cookies", async () => {
  const response = await setup("super_admin", true).run("/dashboard", "refresh");
  assert.match(response.location ?? "", /\/passwort-aendern$/);
  assert.equal(response.cookies.get("orisus_bfs_access_token")?.value, "new-access");
  assert.equal(response.cookies.get("orisus_bfs_refresh_token")?.value, "new-refresh");
});

test("Standortleitung kehrt nach Passwortwechsel ins Standortdashboard zurueck", async () => {
  const response = await setup("standortleitung").run("/passwort-aendern", "refresh");
  assert.match(response.location ?? "", /\/standort\/dashboard$/);
  assert.equal(response.cookies.get("orisus_bfs_access_token")?.value, "new-access");
});
