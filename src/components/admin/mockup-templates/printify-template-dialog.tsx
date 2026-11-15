"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import {
  adminPrintifyKeys,
  createPrintifyTemplate,
  getAdminPrintifyCatalog,
  getAdminPrintifyProviders,
  getPrintifyTemplateJob,
  isJobRunning,
  jobPollInterval,
  printableViews,
  type PrintifyCameraCandidate,
  type PrintifySide,
  type PrintifyTemplateJob,
  searchAdminPrintifyBlueprints,
  startPrintifyTemplateJob,
  startPrintifyTemplateUpdateJob,
} from "@/api/admin-mockup-printify";
import { mockupTemplateKeys } from "@/api/mockup-templates";
import type { PrintifyBlueprint } from "@/api/printify";
import { BlueprintPicker, ChipGroup } from "@/components/shop/printify-publish-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import { mockupViewLabel, productTypeLabel, templateView } from "@/helpers/mockup-template";
import { showToast } from "@/helpers/toast";
import { productTypes } from "@/schemas/batches";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Colors most sellers want, ticked for measuring when the provider makes them. */
const SUGGESTED_COLORS = ["Black", "Navy", "Sport Grey", "Athletic Heather", "Dark Grey Heather", "Red", "Royal", "True Royal", "Forest Green", "Maroon", "Natural", "Sand"];
const MAX_COLORS = 20;

type PrintifyTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A template already linked to Printify, to add sides or measure more colors of; none makes a new template. */
  template?: MockupTemplate | null;
};

/**
 * Makes a shared template of a Printify product without uploading anything: the server prints a calibration sheet on
 * a throwaway product, finds the print area on Printify's own photos, measures the garment colors and deletes the
 * product. The admin then picks a photo per side.
 */
export const PrintifyTemplateDialog = ({ open, onOpenChange, template = null }: PrintifyTemplateDialogProps) => {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {/* Keyed, so every opening starts over. */}
        {open && <PrintifyTemplateFlow key={template?.id ?? "new"} template={template} onBusy={setBusy} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
};

const PrintifyTemplateFlow = ({ template, onBusy, onClose }: { template: MockupTemplate | null; onBusy: (busy: boolean) => void; onClose: () => void }) => {
  const linked = template?.printify ?? null;
  const [blueprint, setBlueprint] = useState<Pick<PrintifyBlueprint, "id" | "title"> | null>(() =>
    linked ? { id: linked.blueprintId, title: linked.blueprintTitle } : null
  );
  const [providerId, setProviderId] = useState<number | null>(() => linked?.printProviderId ?? null);
  const [views, setViews] = useState<PrintifySide[]>(() => (linked ? [] : ["front"]));
  const [colors, setColors] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  const blueprintId = blueprint?.id ?? null;
  const providers = useQuery({
    queryKey: adminPrintifyKeys.providers(blueprintId ?? 0),
    queryFn: () => getAdminPrintifyProviders(blueprintId as number),
    enabled: blueprintId !== null && !linked,
    staleTime: 60 * 60_000,
  });
  const catalog = useQuery({
    queryKey: adminPrintifyKeys.catalog(blueprintId ?? 0, providerId ?? 0),
    queryFn: () => getAdminPrintifyCatalog(blueprintId as number, providerId as number),
    enabled: blueprintId !== null && providerId !== null,
    staleTime: 60 * 60_000,
  });
  const job = useQuery({
    queryKey: adminPrintifyKeys.job(jobId ?? ""),
    queryFn: ({ signal }) => getPrintifyTemplateJob(jobId as string, signal),
    enabled: jobId !== null,
    refetchInterval: (query) => jobPollInterval(query.state.data),
  });

  // The sides the provider prints on; a linked template already has its front.
  const offeredViews = useMemo(() => {
    const printable = catalog.data ? printableViews(catalog.data.positions) : [];
    return linked ? printable.filter((view) => view !== "front") : printable;
  }, [catalog.data, linked]);
  const offeredColors = useMemo(() => (catalog.data?.colors ?? []).filter((color) => color.toLowerCase() !== "white"), [catalog.data]);
  const existingViews = new Set<string>(template?.views?.map((side) => templateView(side)) ?? []);

  // A new catalog suggests the usual colors.
  useEffect(() => {
    if (!catalog.data || linked) return;
    const made = new Set(catalog.data.colors.map((color) => color.toLowerCase()));
    setColors(SUGGESTED_COLORS.filter((color) => made.has(color.toLowerCase())).slice(0, 8));
    // The front is the template itself and can't be unticked, so a provider that prints it always has it ticked again.
    const printable = printableViews(catalog.data.positions);
    setViews((current) => printable.filter((view) => view === "front" || current.includes(view)));
  }, [catalog.data, linked]);

  const start = useMutation({
    mutationFn: () =>
      template && linked
        ? startPrintifyTemplateUpdateJob(template.id, { views, colors })
        : startPrintifyTemplateJob({ blueprintId: blueprintId as number, printProviderId: providerId as number, views, colors }),
    onSuccess: (started) => setJobId(started.jobId),
  });
  useEffect(() => onBusy(start.isPending), [start.isPending, onBusy]);

  const toggle = <T extends string>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const canStart =
    blueprintId !== null && providerId !== null && catalog.data !== undefined && (views.length > 0 || colors.length > 0) && (linked !== null || views.includes("front"));

  const result = job.data;
  const title = linked ? `Measure more of ${template?.name}` : "Create a template from Printify";

  return (
    <>
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            The server prints a calibration sheet on a temporary product in the platform’s Printify store, finds the print area on Printify’s own photos,
            measures the colors and deletes the product. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!jobId ? (
            <SetupStep
              linked={linked !== null}
              blueprint={blueprint}
              onBlueprint={(value) => {
                setBlueprint(value);
                setProviderId(null);
              }}
              providers={providers.data ?? []}
              providersLoading={providers.isFetching}
              providerId={providerId}
              onProvider={setProviderId}
              catalogLoading={catalog.isFetching}
              catalogError={catalog.isError ? getErrorMessage(catalog.error) : providers.isError ? getErrorMessage(providers.error) : null}
              offeredViews={offeredViews}
              existingViews={existingViews}
              views={views}
              onToggleView={(view) => setViews((current) => toggle(current, view))}
              offeredColors={offeredColors}
              colors={colors}
              onToggleColor={(color) => setColors((current) => (current.includes(color) || current.length < MAX_COLORS ? toggle(current, color) : current))}
            />
          ) : !result || isJobRunning(result) ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
              <Loader2 className="text-ink-400 size-8 animate-spin" aria-hidden="true" />
              <p className="text-ink-900 font-medium">{result?.step ?? "Starting"}…</p>
              <p className="text-muted-foreground max-w-md text-sm">This takes a minute or two. You can close this window: the job keeps running for an hour.</p>
            </div>
          ) : result.status === "failed" ? (
            <div className="space-y-3 py-6 text-center" role="alert">
              <p className="text-ink-900 font-medium">Measuring failed</p>
              <p className="text-sm text-red-600">{result.error}</p>
              <Button type="button" variant="outline" onClick={() => setJobId(null)}>
                Change and start again
              </Button>
            </div>
          ) : (
            <ReviewStep job={result} template={template} onDone={onClose} />
          )}
          {start.isError && !jobId && (
            <p role="alert" className="text-sm text-red-600">
              {getErrorMessage(start.error)}
            </p>
          )}
          {job.isError && (
            <p role="alert" className="text-sm text-red-600">
              {getErrorMessage(job.error)}
            </p>
          )}
        </div>
        {!jobId && (
          <DialogFooter className="border-t px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!canStart || start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? "Starting…" : "Start"}
            </Button>
          </DialogFooter>
        )}
    </>
  );
};

type SetupStepProps = {
  linked: boolean;
  blueprint: Pick<PrintifyBlueprint, "id" | "title"> | null;
  onBlueprint: (value: PrintifyBlueprint) => void;
  providers: { id: number; title: string; country: string | null }[];
  providersLoading: boolean;
  providerId: number | null;
  onProvider: (id: number) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  offeredViews: PrintifySide[];
  existingViews: Set<string>;
  views: PrintifySide[];
  onToggleView: (view: PrintifySide) => void;
  offeredColors: string[];
  colors: string[];
  onToggleColor: (color: string) => void;
};

const SetupStep = (props: SetupStepProps) => (
  <div className="space-y-5">
    {props.linked ? (
      <p className="text-ink-700 text-sm">
        {props.blueprint?.title}. A side measured again replaces the photo it has; colors measured are added to the blueprint’s colors.
      </p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2">
        <BlueprintPicker value={props.blueprint} onChange={props.onBlueprint} search={searchAdminPrintifyBlueprints} queryKey="admin-printify-blueprints" />
        {props.blueprint && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="printify-provider">Print provider</Label>
            <Select value={props.providerId ? String(props.providerId) : ""} onValueChange={(value) => value && props.onProvider(Number(value))}>
              <SelectTrigger id="printify-provider" className="w-full">
                <SelectValue placeholder={props.providersLoading ? "Loading providers…" : "Choose a provider"} />
              </SelectTrigger>
              <SelectContent>
                {props.providers.map((provider) => (
                  <SelectItem key={provider.id} value={String(provider.id)}>
                    {provider.title}
                    {provider.country ? ` · ${provider.country}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">Providers in the United States are listed first. Each provider’s photos and print area differ.</p>
          </div>
        )}
      </div>
    )}
    {props.catalogError && (
      <p role="alert" className="text-sm text-red-600">
        {props.catalogError}
      </p>
    )}
    {props.catalogLoading && <p className="text-muted-foreground text-sm">Reading what this provider makes…</p>}
    {props.offeredViews.length > 0 || props.offeredColors.length > 0 ? (
      <>
        <fieldset className="space-y-2">
          <legend className="text-ink-900 text-sm font-medium">Sides</legend>
          {props.offeredViews.length === 0 ? (
            <p className="text-muted-foreground text-xs">This provider prints on no other side.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {props.offeredViews.map((view) => (
                <label key={view} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={props.views.includes(view)}
                    disabled={!props.linked && view === "front"}
                    onCheckedChange={() => props.onToggleView(view)}
                  />
                  {mockupViewLabel(view)}
                  {props.existingViews.has(view) && <span className="text-muted-foreground text-xs">(replaces the one it has)</span>}
                </label>
              ))}
            </div>
          )}
          {!props.linked && <p className="text-muted-foreground text-xs">Only the sides this provider prints on are offered. The front is the template itself.</p>}
          {!props.linked && !props.offeredViews.includes("front") && (
            <p className="text-destructive text-xs">This provider doesn&apos;t print on the front, so it can&apos;t make a template. Choose another provider.</p>
          )}
        </fieldset>
        <div className="space-y-1">
          <ChipGroup label="Colors to measure" options={props.offeredColors} selected={props.colors} onToggle={props.onToggleColor} />
          <p className="text-muted-foreground text-xs">White is always measured: the other colors are measured against it. At most {MAX_COLORS}.</p>
        </div>
      </>
    ) : null}
  </div>
);

/** A measured photo with its print area framed, as a button to pick it. */
const CandidatePhoto = ({ candidate, selected, onSelect }: { candidate: PrintifyCameraCandidate; selected: boolean; onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    aria-label={`Use the ${candidate.camera} photo`}
    className={cn("bg-ink-100 relative w-40 shrink-0 overflow-hidden rounded-lg border-2 text-left", selected ? "border-emerald-600" : "border-transparent")}
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- a measured photo on the image CDN, shown as is */}
    <img src={candidate.photoUrl} alt="" className="block h-auto w-full" />
    <span
      aria-hidden="true"
      className="absolute border-2 border-emerald-500"
      style={{
        left: `${(candidate.x / candidate.photoWidth) * 100}%`,
        top: `${(candidate.y / candidate.photoHeight) * 100}%`,
        width: `${(candidate.width / candidate.photoWidth) * 100}%`,
        height: `${(candidate.height / candidate.photoHeight) * 100}%`,
      }}
    />
    <span className="bg-card/90 text-ink-800 absolute bottom-1 left-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
      {selected && <Check className="size-3" aria-hidden="true" />}
      {candidate.camera}
    </span>
  </button>
);

const ReviewStep = ({ job, template, onDone }: { job: PrintifyTemplateJob; template: MockupTemplate | null; onDone: () => void }) => {
  const queryClient = useQueryClient();
  const [cameras, setCameras] = useState<Partial<Record<PrintifySide, string>>>(() =>
    Object.fromEntries(job.sides.filter((side) => side.candidates.length > 0).map((side) => [side.view, side.candidates[0].camera]))
  );
  const [kept, setKept] = useState<string[]>(() => job.measuredColors.map((color) => color.name));
  const [name, setName] = useState(`${job.blueprintTitle} (${job.printProviderTitle})`.slice(0, 100));
  const [productType, setProductType] = useState<string>("tshirt");
  const [sizes, setSizes] = useState<string[]>(() => job.sizes.filter((size) => ["S", "M", "L", "XL", "2XL"].includes(size)));
  const creating = template === null;

  const save = useMutation({
    mutationFn: () => createPrintifyTemplate(job.jobId, { cameras, colors: kept, ...(creating ? { name, productType, defaultSizes: sizes } : {}) }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminPrintifyKeys.colors(job.blueprintId) });
      showToast("success", creating ? `${saved.name} was created.` : `${saved.name} was updated.`);
      onDone();
    },
  });

  const frontMissing = creating && !cameras.front;

  return (
    <div className="space-y-5">
      {job.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-md border border-amber-200 bg-amber-50 py-2 pr-3 pl-7 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {job.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {job.sides.map((side) => (
        <section key={side.view} className="space-y-2">
          <h3 className="text-ink-900 text-sm font-medium">{mockupViewLabel(side.view)}</h3>
          {side.candidates.length === 0 ? (
            <p className="text-sm text-red-600">{side.problem}</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {side.candidates.map((candidate) => (
                <CandidatePhoto
                  key={candidate.camera}
                  candidate={candidate}
                  selected={cameras[side.view] === candidate.camera}
                  onSelect={() => setCameras((current) => ({ ...current, [side.view]: candidate.camera }))}
                />
              ))}
            </div>
          )}
        </section>
      ))}
      {job.measuredColors.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-ink-900 text-sm font-medium">Colors</h3>
          <p className="text-muted-foreground text-xs">Saved for every template of this blueprint. Untick a color to leave it out.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {job.measuredColors.map((color) => (
              <li key={color.name}>
                <label className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                  <Checkbox
                    checked={kept.includes(color.name)}
                    onCheckedChange={() => setKept((current) => (current.includes(color.name) ? current.filter((item) => item !== color.name) : [...current, color.name]))}
                  />
                  <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: color.photoHex }} title={`Printify photo ${color.photoHex}`} />
                  <span className="text-ink-900 min-w-0 flex-1 truncate">{color.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{color.recolorHex}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
      {creating && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="printify-template-name">Template name</Label>
            <Input id="printify-template-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="printify-template-type">Product type</Label>
            <Select value={productType} onValueChange={(value) => value && setProductType(value)}>
              <SelectTrigger id="printify-template-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {productTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <ChipGroup label="Default sizes" options={job.sizes} selected={sizes} onToggle={(size) => setSizes((current) => (current.includes(size) ? current.filter((item) => item !== size) : [...current, size]))} />
          </div>
        </section>
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-red-600">
          {getErrorMessage(save.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
          Close
        </Button>
        <Button type="button" disabled={save.isPending || frontMissing || (creating && name.trim().length === 0)} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : creating ? "Create template" : "Save"}
        </Button>
      </div>
    </div>
  );
};
