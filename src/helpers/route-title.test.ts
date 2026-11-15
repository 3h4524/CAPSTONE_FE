import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { findRouteTitle } from "@/helpers/route-title";

const APP_DIRECTORY = path.join(process.cwd(), "src", "app");
const ROUTE_GROUPS = ["(private)", "(admin)"];

const collectPagePathnames = (directory: string, segments: string[] = []): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      const isGroup = entry.startsWith("(") && entry.endsWith(")");
      return collectPagePathnames(entryPath, isGroup ? segments : [...segments, entry]);
    }
    return entry === "page.tsx" ? [`/${segments.join("/")}`] : [];
  });

describe("findRouteTitle", () => {
  it("returns null without a pathname or a matching route", () => {
    expect(findRouteTitle(null)).toBeNull();
    expect(findRouteTitle("/unknown")).toBeNull();
  });

  it("matches a route exactly", () => {
    expect(findRouteTitle("/subscription")?.titleKey).toBe("navigation.items.billing");
  });

  it("falls back to the parent of a nested route", () => {
    expect(findRouteTitle("/design-templates/new")?.path).toBe("/design-templates");
    expect(findRouteTitle("/admin/test-reports/abc")?.path).toBe("/admin/test-reports");
  });

  it("prefers the longest matching path", () => {
    expect(findRouteTitle("/admin/profile")?.titleKey).toBe("navigation.admin.items.profile");
    expect(findRouteTitle("/profile")?.titleKey).toBe("navigation.items.profile");
  });

  it("does not match a path that only shares a prefix", () => {
    expect(findRouteTitle("/shopping")).toBeNull();
  });

  it.each(ROUTE_GROUPS.flatMap((group) => collectPagePathnames(path.join(APP_DIRECTORY, group))))(
    "has a title for %s",
    (pathname) => {
      const concretePathname = pathname.replace(/\[[^\]]+\]/g, "sample");
      expect(findRouteTitle(concretePathname)).not.toBeNull();
    }
  );
});
