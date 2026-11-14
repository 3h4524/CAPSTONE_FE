"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, ListFilter, ShieldBan, SlidersHorizontal } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { BlocklistPanel } from "@/components/admin/content-safety/blocklist/blocklist-panel";
import { LogPanel } from "@/components/admin/content-safety/log/log-panel";
import { OverviewPanel } from "@/components/admin/content-safety/overview/overview-panel";
import { SettingsPanel } from "@/components/admin/content-safety/settings/settings-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "log", label: "Activity log", icon: ListFilter },
  { value: "blocklist", label: "Blocklist", icon: ShieldBan },
  { value: "settings", label: "Settings", icon: SlidersHorizontal },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const isTab = (value: string | null): value is TabValue => TABS.some((tab) => tab.value === value);

export const ContentSafetyDashboard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: TabValue = isTab(requested) ? requested : "overview";

  // The open tab lives in the URL, so a link can open it and a reload keeps it.
  const openTab = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "overview") next.delete("tab");
      else next.set("tab", value);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <AdminShell pageTitle="Content Safety">
      <div className="flex flex-col gap-6 max-md:gap-4">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight max-md:text-lg sm:text-2xl">
            Content safety guardrail
          </h2>
          <p className="text-ink-600 max-w-3xl text-sm leading-relaxed max-md:hidden">
            Seller prompts and the images AI returns are checked by the keyword{" "}
            <strong className="text-ink-800 font-semibold">blocklist</strong>, then by{" "}
            <strong className="text-ink-800 font-semibold">Gemini</strong>. Follow what was blocked, keep the blocklist
            current and decide how strict each category is.
          </p>
        </header>

        <Tabs value={tab} onValueChange={openTab} className="gap-5 max-md:gap-3">
          <TabsList className="bg-ink-200/70 h-11 w-full overflow-x-auto sm:w-fit">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="px-4 text-sm max-md:px-2">
                <Icon aria-hidden="true" />
                <span className="max-sm:sr-only">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <OverviewPanel onOpenLog={() => openTab("log")} />
          </TabsContent>
          <TabsContent value="log">
            <LogPanel />
          </TabsContent>
          <TabsContent value="blocklist">
            <BlocklistPanel />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
};
