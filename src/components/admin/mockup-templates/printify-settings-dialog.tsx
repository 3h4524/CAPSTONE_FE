"use client";

import { useState } from "react";
import { Plus, Ruler, Trash2, Unlink } from "lucide-react";

import {
  adminPrintifyKeys,
  deletePrintifyColor,
  getAdminPrintifyCatalog,
  listPrintifyColors,
  type PrintifyColorRow,
  savePrintifyColor,
} from "@/api/admin-mockup-printify";
import { linkMockupTemplatePrintify, unlinkMockupTemplatePrintify } from "@/api/admin-mockup-templates";
import { mockupTemplateKeys } from "@/api/mockup-templates";
import { PrintifyTemplateDialog } from "@/components/admin/mockup-templates/printify-template-dialog";
import { ChipGroup } from "@/components/shop/printify-publish-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate } from "@/types/mockup-templates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const HEX = /^#[0-9A-Fa-f]{6}$/;

type PrintifySettingsDialogProps = {
  template: MockupTemplate | null;
  onOpenChange: (open: boolean) => void;
};

/** What a template linked to Printify is pushed with, its blueprint's colors, and its other sides. */
export const PrintifySettingsDialog = ({ template, onOpenChange }: PrintifySettingsDialogProps) => {
  const [measuring, setMeasuring] = useState(false);
  const linked = template?.printify ?? null;

  return (
    <>
      <Dialog open={template !== null && !measuring} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
            <DialogTitle>Printify settings</DialogTitle>
            <DialogDescription>
              {linked ? `${template?.name}: ${linked.blueprintTitle}${linked.printProviderTitle ? ` by ${linked.printProviderTitle}` : ""}.` : null}
            </DialogDescription>
          </DialogHeader>
          {template && linked && (
            <SettingsBody key={template.id} template={template} onMeasure={() => setMeasuring(true)} onUnlinked={() => onOpenChange(false)} />
          )}
        </DialogContent>
      </Dialog>
      <PrintifyTemplateDialog open={measuring} onOpenChange={(next) => !next && setMeasuring(false)} template={template} />
    </>
  );
};

const SettingsBody = ({ template, onMeasure, onUnlinked }: { template: MockupTemplate; onMeasure: () => void; onUnlinked: () => void }) => {
  const linked = template.printify!;
  const queryClient = useQueryClient();
  const openPopup = usePopupStore((state) => state.openPopup);
  const [sizes, setSizes] = useState<string[]>(linked.defaultSizes);
  const catalog = useQuery({
    queryKey: adminPrintifyKeys.catalog(linked.blueprintId, linked.printProviderId ?? 0),
    queryFn: () => getAdminPrintifyCatalog(linked.blueprintId, linked.printProviderId as number),
    enabled: linked.printProviderId !== null,
    staleTime: 60 * 60_000,
  });

  const refreshTemplates = () => queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });

  const saveSizes = useMutation({
    // The link is saved whole: the same product and provider, with the sizes chosen.
    mutationFn: () =>
      linkMockupTemplatePrintify({
        id: template.id,
        input: {
          blueprintId: linked.blueprintId,
          blueprintTitle: linked.blueprintTitle,
          blueprintImageUrl: linked.blueprintImageUrl ?? null,
          printProviderId: linked.printProviderId,
          printProviderTitle: linked.printProviderTitle,
          defaultSizes: sizes,
        },
      }),
    onSuccess: async () => {
      await refreshTemplates();
      showToast("success", "The default sizes were saved.");
    },
  });
  const unlink = useMutation({
    mutationFn: () => unlinkMockupTemplatePrintify(template.id),
    onSuccess: async () => {
      await refreshTemplates();
      showToast("success", `${template.name} is no longer linked to Printify.`);
      onUnlinked();
    },
  });

  const askUnlink = () =>
    openPopup({
      title: `Unlink ${template.name} from Printify?`,
      description: "It stays, with its photos, as an ordinary template: its print area and colors can then be changed freely, and it is not offered for Printify products.",
      positiveLabel: "Unlink",
      onPositive: () => unlink.mutate(),
    });

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
      <section className="space-y-2">
        <h3 className="text-ink-900 text-sm font-medium">Default sizes</h3>
        {catalog.data ? (
          <ChipGroup
            label="Sizes"
            options={catalog.data.sizes}
            selected={sizes}
            onToggle={(size) => setSizes((current) => (current.includes(size) ? current.filter((item) => item !== size) : [...current, size]))}
          />
        ) : (
          <p className="text-muted-foreground text-xs">{catalog.isError ? getErrorMessage(catalog.error) : "Reading the provider’s sizes…"}</p>
        )}
        {saveSizes.isError && (
          <p role="alert" className="text-sm text-red-600">
            {getErrorMessage(saveSizes.error)}
          </p>
        )}
        <Button type="button" size="sm" variant="outline" disabled={sizes.length === 0 || saveSizes.isPending} onClick={() => saveSizes.mutate()}>
          {saveSizes.isPending ? "Saving…" : "Save sizes"}
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-ink-900 text-sm font-medium">Sides and colors from Printify</h3>
        <p className="text-muted-foreground text-xs">Add the back or a sleeve, photograph one again, or measure more colors. The server reads them on Printify, as it did for this template.</p>
        <Button type="button" size="sm" variant="outline" onClick={onMeasure}>
          <Ruler aria-hidden="true" />
          Measure sides or colors
        </Button>
      </section>

      <ColorTable blueprintId={linked.blueprintId} catalogColors={catalog.data?.colors ?? []} />

      <section className="space-y-2 border-t pt-4">
        {unlink.isError && (
          <p role="alert" className="text-sm text-red-600">
            {getErrorMessage(unlink.error)}
          </p>
        )}
        <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={unlink.isPending} onClick={askUnlink}>
          <Unlink aria-hidden="true" />
          Unlink from Printify
        </Button>
      </section>
    </div>
  );
};

/** The blueprint's garment colors, as every template of it recolors its white photo. */
const ColorTable = ({ blueprintId, catalogColors }: { blueprintId: number; catalogColors: string[] }) => {
  const queryClient = useQueryClient();
  const colors = useQuery({ queryKey: adminPrintifyKeys.colors(blueprintId), queryFn: () => listPrintifyColors(blueprintId) });
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminPrintifyKeys.colors(blueprintId) });
    await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
  };
  const save = useMutation({
    mutationFn: (input: { name: string; hex: string }) => savePrintifyColor({ blueprintId, ...input }),
    onSuccess: async () => {
      await refresh();
      setNewName("");
      setNewHex("");
    },
  });
  const remove = useMutation({ mutationFn: deletePrintifyColor, onSuccess: refresh });

  const listed = new Set((colors.data ?? []).filter((row) => !row.shared).map((row) => row.name.toLowerCase()));
  const addable = catalogColors.filter((color) => !listed.has(color.toLowerCase()));

  return (
    <section className="space-y-2">
      <h3 className="text-ink-900 text-sm font-medium">Colors of this blueprint</h3>
      <p className="text-muted-foreground text-xs">Every template of this blueprint uses them. The hex recolors the white photo; a shared color is used when the blueprint has none of its own.</p>
      {colors.isError && <p className="text-sm text-red-600">{getErrorMessage(colors.error)}</p>}
      <ul className="divide-y rounded-md border">
        {(colors.data ?? []).map((row) => (
          <ColorRow key={row.id} row={row} busy={save.isPending || remove.isPending} onSave={(hex) => save.mutate({ name: row.name, hex })} onDelete={() => remove.mutate(row.id)} />
        ))}
        {colors.data?.length === 0 && <li className="text-muted-foreground px-3 py-2 text-sm">No colors yet.</li>}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor="printify-color-name">Add a color</Label>
          <Select value={newName} onValueChange={(value) => setNewName(value ?? "")}>
            <SelectTrigger id="printify-color-name" className="w-full">
              <SelectValue placeholder="Printify color" />
            </SelectTrigger>
            <SelectContent>
              {addable.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1">
          <Label htmlFor="printify-color-hex">Hex</Label>
          <Input id="printify-color-hex" value={newHex} placeholder="#232424" maxLength={7} onChange={(event) => setNewHex(event.target.value.trim())} />
        </div>
        <Button type="button" size="sm" disabled={!newName || !HEX.test(newHex) || save.isPending} onClick={() => save.mutate({ name: newName, hex: newHex })}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-red-600">
          {getErrorMessage(save.error ?? remove.error)}
        </p>
      )}
    </section>
  );
};

const ColorRow = ({ row, busy, onSave, onDelete }: { row: PrintifyColorRow; busy: boolean; onSave: (hex: string) => void; onDelete: () => void }) => {
  const [hex, setHex] = useState(row.hex);
  const changed = hex.toUpperCase() !== row.hex.toUpperCase();
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: HEX.test(hex) ? hex : row.hex }} aria-hidden="true" />
      <span className="text-ink-900 min-w-0 flex-1 truncate">{row.name}</span>
      {row.shared ? (
        <>
          <Badge variant="outline">Shared</Badge>
          <span className="text-muted-foreground font-mono text-xs">{row.hex}</span>
        </>
      ) : (
        <>
          <Input aria-label={`${row.name} hex`} value={hex} maxLength={7} className="h-8 w-24 font-mono text-xs" onChange={(event) => setHex(event.target.value.trim())} />
          {changed && (
            <Button type="button" size="sm" variant="outline" disabled={busy || !HEX.test(hex)} onClick={() => onSave(hex)}>
              Save
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" aria-label={`Delete ${row.name}`} disabled={busy} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      )}
    </li>
  );
};
