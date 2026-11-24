import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

const SIGNED_IN = { cookie: "__Host-apcs_refresh=token" };

const visit = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(new URL(path, "http://localhost:3000"), { headers }));

const passesThrough = (response: ReturnType<typeof proxy>) =>
  response.headers.get("x-middleware-next") === "1";

describe("proxy", () => {
  it.each(["/dashboard", "/batches", "/design-templates/new", "/admin/test-reports/run-1"])(
    "sends a guest on the private route %s to login",
    (path) => {
      const response = visit(path);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000/login?returnUrl=${encodeURIComponent(path)}`
      );
    }
  );

  it("keeps the query string in the return url", () => {
    const response = visit("/workflows?tab=runs");

    expect(response.headers.get("location")).toBe(
      `http://localhost:3000/login?returnUrl=${encodeURIComponent("/workflows?tab=runs")}`
    );
  });

  it.each(["/this-route-does-not-exist", "/dashboards", "/admin-panel"])(
    "lets a guest reach the not-found page for the unknown route %s",
    (path) => {
      expect(passesThrough(visit(path))).toBe(true);
    }
  );

  it.each(["/", "/verify-email", "/etsy/callback"])("lets a guest open the public route %s", (path) => {
    expect(passesThrough(visit(path))).toBe(true);
  });

  it("lets a signed-in seller open a private route", () => {
    expect(passesThrough(visit("/dashboard", SIGNED_IN))).toBe(true);
  });

  it("sends a signed-in seller away from the guest-only login page", () => {
    const response = visit("/login", SIGNED_IN);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
