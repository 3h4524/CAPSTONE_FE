"use client";

import { useState } from "react";
import { Link2, Printer, Settings2 } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PrintifyLinkDialog } from "@/components/admin/mockup-templates/printify-link-dialog";
import { PrintifySettingsDialog } from "@/components/admin/mockup-templates/printify-settings-dialog";
import { PrintifyTemplateDialog } from "@/components/admin/mockup-templates/printify-template-dialog";
import { MockupTemplatesPanel } from "@/components/mockups/mockup-templates-panel";
import { Button } from "@/components/ui/button";
import type { MockupTemplate } from "@/types/mockup-templates";

export const MockupTemplateLibrary = () => {
  const [creating, setCreating] = useState(false);
  const [settingsOf, setSettingsOf] = useState<MockupTemplate | null>(null);
  const [linking, setLinking] = useState<MockupTemplate | null>(null);

  return (
    <AdminShell pageTitle="Mock-up Templates">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight sm:text-2xl">Mock-up template library</h2>
          <p className="text-ink-600 max-w-3xl text-sm leading-relaxed">
            Every seller can use these templates. A template of a Printify product shows Printify’s own photo, print area and colors, so a mock-up
            looks like what Printify prints. Make one with Create from Printify (the photo and print area are measured on Printify), or link an uploaded
            template to the Printify product it shows by hand.
          </p>
        </header>
        <MockupTemplatesPanel
          scope="admin"
          actions={
            <Button type="button" variant="outline" className="max-md:w-full" onClick={() => setCreating(true)}>
              <Printer aria-hidden="true" />
              Create from Printify
            </Button>
          }
          cardActions={(template) =>
            template.printify ? (
              <Button type="button" variant="ghost" size="sm" className="max-md:flex-1" onClick={() => setSettingsOf(template)}>
                <Settings2 aria-hidden="true" />
                <span className="max-md:sr-only">Printify settings</span>
              </Button>
            ) : template.isSystemTemplate ? (
              <Button type="button" variant="ghost" size="sm" className="max-md:flex-1" onClick={() => setLinking(template)}>
                <Link2 aria-hidden="true" />
                <span className="max-md:sr-only">Link to Printify</span>
              </Button>
            ) : null
          }
        />
      </div>
      <PrintifyTemplateDialog open={creating} onOpenChange={setCreating} />
      <PrintifySettingsDialog template={settingsOf} onOpenChange={(open) => !open && setSettingsOf(null)} />
      <PrintifyLinkDialog template={linking} onOpenChange={(open) => !open && setLinking(null)} />
    </AdminShell>
  );
};
