"use client";

import { useState } from "react";
import { Link2, Printer, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PrintifyLinkDialog } from "@/components/admin/mockup-templates/printify-link-dialog";
import { PrintifySettingsDialog } from "@/components/admin/mockup-templates/printify-settings-dialog";
import { PrintifyTemplateDialog } from "@/components/admin/mockup-templates/printify-template-dialog";
import { MockupTemplatesPanel } from "@/components/mockups/mockup-templates-panel";
import { Button } from "@/components/ui/button";
import type { MockupTemplate } from "@/types/mockup-templates";

export const MockupTemplateLibrary = () => {
  const { t } = useTranslation("common");
  const [creating, setCreating] = useState(false);
  const [settingsOf, setSettingsOf] = useState<MockupTemplate | null>(null);
  const [linking, setLinking] = useState<MockupTemplate | null>(null);

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight sm:text-2xl">{t("admin.mockups.library.title")}</h2>
          <p className="text-ink-600 max-w-3xl text-sm leading-relaxed">{t("admin.mockups.library.description")}</p>
        </header>
        <MockupTemplatesPanel
          scope="admin"
          actions={
            <Button type="button" variant="outline" className="max-md:w-full" onClick={() => setCreating(true)}>
              <Printer aria-hidden="true" />
              {t("admin.mockups.library.createFromPrintify")}
            </Button>
          }
          cardActions={(template) =>
            template.printify ? (
              <Button type="button" variant="ghost" size="sm" className="max-md:flex-1" onClick={() => setSettingsOf(template)}>
                <Settings2 aria-hidden="true" />
                <span className="max-md:sr-only">{t("admin.mockups.shared.printifySettings")}</span>
              </Button>
            ) : template.isSystemTemplate ? (
              <Button type="button" variant="ghost" size="sm" className="max-md:flex-1" onClick={() => setLinking(template)}>
                <Link2 aria-hidden="true" />
                <span className="max-md:sr-only">{t("admin.mockups.shared.linkToPrintify")}</span>
              </Button>
            ) : null
          }
        />
      </div>
      <PrintifyTemplateDialog open={creating} onOpenChange={setCreating} />
      <PrintifySettingsDialog template={settingsOf} onOpenChange={(open) => !open && setSettingsOf(null)} />
      <PrintifyLinkDialog template={linking} onOpenChange={(open) => !open && setLinking(null)} />
    </>
  );
};
