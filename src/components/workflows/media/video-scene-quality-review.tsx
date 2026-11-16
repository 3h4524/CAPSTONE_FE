"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileVideo,
  Film,
  HardDrive,
  Info,
  Maximize2,
  PlayCircle,
  RectangleHorizontal,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { evaluateVideoScene, getVideoQualitySummary, getVideoSceneQuality, reviseVideoExperience, saveVideoSceneReview, setVideoExperienceStatus, videoWorkflowKeys } from "@/api/video-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQuery } from "@/hooks/queries/use-query";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { CorrectionTarget, PromoVideo, VideoReviewCategory, VideoReviewSeverity } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

const categories: { value: VideoReviewCategory; label: string }[] = [
  { value: "body", label: "Body" }, { value: "hands", label: "Hands" },
  { value: "person_product", label: "Person and product" }, { value: "artwork", label: "Artwork / print" },
  { value: "text", label: "Text" }, { value: "camera", label: "Camera" }, { value: "other", label: "Other" },
];
const severities: VideoReviewSeverity[] = ["low", "medium", "high", "critical"];
const targets: { value: CorrectionTarget; label: string }[] = [
  { value: "source_image", label: "Source image" }, { value: "prompt_template", label: "Prompt template" },
  { value: "prompt_rule", label: "Prompt rule" }, { value: "rag_experience", label: "RAG experience" },
  { value: "unknown", label: "Not enough evidence" },
];

const display = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const secondsToMilliseconds = (value: string) => Math.round(Number(value) * 1000);
const objectValue = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numberValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const technicalText = (value: unknown, notRecorded: string, suffix = "") => {
  const number = numberValue(value);
  return number === null ? notRecorded : `${Number(number.toFixed(2))}${suffix}`;
};
const etsyLabels: Record<string, string> = {
  decode: "Video decoding", duration: "Duration", fileSize: "File size", format: "File format",
  resolution: "Resolution", aspectRatio: "Aspect ratio",
};
// The promo videos are silent by design, so the audio check says nothing a seller can act on: it is not listed.
const HIDDEN_ETSY_CHECKS = new Set(["audio"]);
const etsyIcons: Record<string, typeof Film> = {
  decode: PlayCircle, duration: Clock3, fileSize: HardDrive, format: FileVideo,
  resolution: Maximize2, aspectRatio: RectangleHorizontal,
};
const sceneMetrics = [
  { key: "subject_consistency", label: "Subject consistency", description: "Stability of the subject between frames." },
  { key: "background_consistency", label: "Background consistency", description: "Stability of the background between frames." },
  { key: "motion_smoothness", label: "Motion smoothness", description: "Continuity of movement across frames." },
  { key: "imaging_quality", label: "Image quality", description: "Visual quality of the frames." },
  { key: "aesthetic_quality", label: "Aesthetic quality", description: "Overall visual presentation." },
];

// Status colours follow the rest of the workflow (approved / pass = emerald, processing = sky, stopped / fail = rose).
// They are kept for the pill and one small mark: a check that passed stays neutral, so the one that does not stands out.
type QualityTone = "pass" | "fail" | "warning" | "pending" | "neutral";
const toneClasses: Record<QualityTone, string> = {
  pass: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-400/20",
  fail: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-400/20",
  warning: "bg-amber-50 text-amber-900 ring-amber-600/25 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-400/20",
  pending: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-400/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};
/** The round mark in the overall status header: the pill's hue, one step stronger. */
const toneChipClasses: Record<QualityTone, string> = {
  pass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  fail: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  pending: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
};
/** A check's row: a faint wash only when it is a warning or a failure; a pass has none. */
const toneRowClasses: Record<QualityTone, string> = {
  pass: "",
  fail: "bg-rose-50/70 dark:bg-rose-950/15",
  warning: "bg-amber-50/70 dark:bg-amber-950/15",
  pending: "",
  neutral: "",
};
/** The one status mark at the end of a check's row. */
const toneIconTextClasses: Record<QualityTone, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  fail: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  pending: "text-sky-600 dark:text-sky-400",
  neutral: "text-muted-foreground",
};
const statusTone = (status: string): QualityTone => {
  if (["pass", "passed"].includes(status)) return "pass";
  if (["fail", "failed"].includes(status)) return "fail";
  if (["warning", "pass_with_warning", "uncertain"].includes(status)) return "warning";
  if (["queued", "running"].includes(status)) return "pending";
  return "neutral";
};
const toneIcon = (tone: QualityTone) =>
  tone === "pass" ? CheckCircle2 : tone === "fail" ? XCircle : tone === "warning" ? AlertCircle : Clock3;
/** The mark of a check's row: a plain tick, a cross or a warning sign; anything else is information. */
const checkIcon = (tone: QualityTone) => (tone === "pass" ? Check : tone === "fail" ? XCircle : tone === "warning" ? AlertCircle : Info);
function StatusPill({ label, tone }: { label: string; tone: QualityTone }) {
  const Icon = toneIcon(tone);
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[tone]}`}><Icon className="size-3.5" aria-hidden="true" />{label}</span>;
}
const SCENE_STATUS_KEYS = ["completed", "failed", "running", "queued", "skipped", "uncertain", "not_applicable"];
const sceneStatusKey = (status: string) => (SCENE_STATUS_KEYS.includes(status) ? status : "not_applicable");
// Display-only bands on a 0–1 scale. These are not calibrated quality thresholds.
const scoreBand = (score: number | null) => score === null || score < 0 || score > 1 ? null : score >= 0.8 ? "High" : score >= 0.5 ? "Medium" : "Low";
const bandColors = {
  High: { text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-600 dark:bg-emerald-400" },
  Medium: { text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-600 dark:bg-amber-400" },
  Low: { text: "text-red-700 dark:text-red-400", bar: "bg-red-600 dark:bg-red-400" },
} as const;

const sceneOverall = (metrics: Record<string, unknown>): number | null => {
  const vbench = objectValue(metrics.vbench);
  const dimensions = objectValue(vbench.dimensions);
  const scores = sceneMetrics.map(({ key }) => {
    const score = numberValue(vbench[`${key}Score`]);
    const status = objectValue(dimensions[key]).status;
    return score !== null && score >= 0 && score <= 1 && (status === undefined || status === "completed") ? score : null;
  });
  return scores.every((score): score is number => score !== null)
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null;
};

function QualityScore({ score }: { score: number }) {
  const { t } = useTranslation("common");
  const percentage = Math.round(score * 100);
  return <div className="relative grid size-20 shrink-0 place-items-center" aria-label={t("workflowMedia.quality.vbenchAverage", { score: percentage })}>
    <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-primary/10" />
      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray={`${percentage} 100`} className="text-primary" />
    </svg>
    <span className="text-xl font-semibold tabular-nums">{percentage}<span className="text-muted-foreground text-xs font-normal">/100</span></span>
  </div>;
}

function MetricBar({ score, classified = false }: { score: number | null; classified?: boolean }) {
  if (score === null || score < 0 || score > 1) return null;
  const band = classified ? scoreBand(score) : null;
  return <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true"><div className={`h-full rounded-full ${band ? bandColors[band].bar : "bg-primary"}`} style={{ width: `${score * 100}%` }} /></div>;
}

function SceneMetrics({ metrics }: { metrics: Record<string, unknown> }) {
  const { t } = useTranslation("common");
  const vbench = objectValue(metrics.vbench);
  const dimensions = objectValue(vbench.dimensions);
  const ocr = objectValue(metrics.paddleOcr);
  const fidelity = objectValue(metrics.inputFidelity);
  const ocrMetrics = [
    { key: "sourceTokenRecall", label: t("workflowMedia.quality.ocr.sourceTokenRecall") },
    { key: "frameTextConsistency", label: t("workflowMedia.quality.ocr.frameTextConsistency") },
    { key: "meanRecognitionConfidence", label: t("workflowMedia.quality.ocr.meanRecognitionConfidence") },
  ];
  return (
    <div className="space-y-5 text-sm">
      <div><h5 className="font-semibold">{t("workflowMedia.quality.sceneMetricsTitle")}</h5><p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t("workflowMedia.quality.sceneMetricsDescription")}</p></div>
      {Object.keys(vbench).length > 0 && <div className="space-y-1">
        <p className="font-medium">VBench</p>
        <dl className="space-y-4 pt-2">{sceneMetrics.map(({ key, label, description }) => {
          const score = numberValue(vbench[`${key}Score`]);
          const status = objectValue(dimensions[key]).status;
          const band = scoreBand(score);
          return <div key={key} className="space-y-2"><div className="flex items-start justify-between gap-3"><div><dt className="font-medium">{t(`workflowMedia.quality.metrics.${key}.label`, { defaultValue: label })}</dt><dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{t(`workflowMedia.quality.metrics.${key}.description`, { defaultValue: description })}</dd></div><div className="shrink-0 text-right"><span className="font-semibold tabular-nums">{score !== null ? score.toFixed(4) : typeof status === "string" ? display(status) : t("workflowMedia.quality.notAvailable")}</span>{band && <p className={`mt-0.5 text-xs ${bandColors[band].text}`}>{t("workflowMedia.quality.bandGuide", { band: t(`workflowMedia.quality.bands.${band}`) })}</p>}</div></div><MetricBar score={score} classified /></div>;
        })}</dl>
      </div>}
      {Object.keys(fidelity).length > 0 && <div className="space-y-1 border-t pt-3">
        <p className="font-medium">{t("workflowMedia.quality.fidelityTitle")}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{t("workflowMedia.quality.fidelityDescription")}</p>
        {[
          { key: "i2vSubject", label: t("workflowMedia.quality.fidelity.i2vSubject.label"), description: t("workflowMedia.quality.fidelity.i2vSubject.description") },
          { key: "artwork", label: t("workflowMedia.quality.fidelity.artwork.label"), description: t("workflowMedia.quality.fidelity.artwork.description") },
        ].map(({ key, label, description }) => {
          const metric = objectValue(fidelity[key]);
          const score = numberValue(metric.score);
          return <div key={key} className="space-y-2 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{label}</p><p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{typeof metric.reason === "string" ? metric.reason : description}</p>{typeof metric.trackedFrameCount === "number" && typeof metric.sampledFrameCount === "number" && <p className="text-muted-foreground mt-1 text-xs">{t("workflowMedia.quality.trackedFrames", { tracked: metric.trackedFrameCount, sampled: metric.sampledFrameCount })}</p>}</div><div className="shrink-0 text-right"><span className="font-semibold tabular-nums">{score === null ? typeof metric.status === "string" ? display(metric.status) : t("workflowMedia.quality.notAvailable") : score.toFixed(4)}</span>{score !== null && typeof metric.status === "string" && metric.status !== "completed" && <p className="text-muted-foreground mt-1 text-xs">{display(metric.status)}</p>}</div></div><MetricBar score={score} /></div>;
        })}
      </div>}
      {Object.keys(ocr).length > 0 && <div className="space-y-1 border-t pt-3">
        <p className="font-medium">{t("workflowMedia.quality.textRecognition")} <span className="text-muted-foreground font-normal">{ocr.status === "uncertain" ? t("workflowMedia.quality.notEnoughEvidenceSuffix") : typeof ocr.status === "string" ? `· ${display(ocr.status)}` : ""}</span></p>
        <p className="text-muted-foreground text-xs">{t("workflowMedia.quality.ocrGuide")}</p>
        {typeof ocr.framesWithTextMatch === "number" && typeof ocr.sampledFrameCount === "number" && <p className="text-muted-foreground text-xs">{t("workflowMedia.quality.ocrFrames", { matched: ocr.framesWithTextMatch, sampled: ocr.sampledFrameCount })}</p>}
        {typeof ocr.reason === "string" && <p className="text-muted-foreground">{ocr.reason}</p>}
        {ocrMetrics.map(({ key, label }) => { const score = numberValue(ocr[key]); const band = scoreBand(score); return score === null ? null : <div key={key} className="space-y-2 py-2"><div className="flex justify-between gap-3"><span>{label}</span><span className="shrink-0 font-semibold tabular-nums">{score.toFixed(4)}{band && <span className={`ml-2 text-xs font-normal ${bandColors[band].text}`}>{t("workflowMedia.quality.bandGuide", { band: t(`workflowMedia.quality.bands.${band}`) })}</span>}</span></div><MetricBar score={score} classified /></div>; })}
      </div>}
      <details><summary className="text-muted-foreground cursor-pointer">{t("workflowMedia.quality.viewRawMetrics")}</summary><pre className="bg-muted mt-2 overflow-auto rounded p-2 text-[11px] leading-relaxed">{JSON.stringify(metrics, null, 2)}</pre></details>
    </div>
  );
}

function SceneQualityResult({ metrics, sceneNumber }: { metrics: Record<string, unknown>; sceneNumber: number }) {
  const { t } = useTranslation("common");
  const score = sceneOverall(metrics);
  return <Dialog>
    <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><BarChart3 aria-hidden="true" /> {t("workflowMedia.quality.viewDetails")}</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle>{t("workflowMedia.quality.detailsTitle", { scene: sceneNumber })}</DialogTitle>
        <DialogDescription>{t("workflowMedia.quality.detailsDescription")}</DialogDescription>
      </DialogHeader>
      <div className="bg-muted/40 flex items-center gap-4 rounded-lg p-4">
        {score !== null && <QualityScore score={score} />}
        <div className="space-y-1"><p className="text-sm font-semibold">{score === null ? t("workflowMedia.quality.overallUnavailable") : t("workflowMedia.quality.overallGuide")}</p><p className="text-muted-foreground text-xs leading-relaxed">{t("workflowMedia.quality.overallDescription")}</p></div>
      </div>
      <SceneMetrics metrics={metrics} />
    </DialogContent>
  </Dialog>;
}

export const VideoSceneQualityReview = ({ runId, video, showObservationForm = false }: {
  runId: string;
  video: PromoVideo;
  showObservationForm?: boolean;
}) => {
  const { t } = useTranslation("common");
  const sceneStatusLabel = (status: string) => t(`workflowMedia.quality.sceneStatuses.${sceneStatusKey(status)}`);
  const notRecorded = t("workflowMedia.quality.notRecorded");
  const scenes = useMemo(() => video.scenes.filter((scene) => scene.generationStrategy === "ai_shot"), [video.scenes]);
  const [sceneOrder, setSceneOrder] = useState<number | null>(scenes[0]?.sceneOrder ?? null);
  const [startSeconds, setStartSeconds] = useState("0");
  const [endSeconds, setEndSeconds] = useState("1");
  const [category, setCategory] = useState<VideoReviewCategory>("hands");
  const [severity, setSeverity] = useState<VideoReviewSeverity>("medium");
  const [presentInSourceImage, setPresentInSourceImage] = useState(false);
  const [description, setDescription] = useState("");
  const [confirmSuggestion, setConfirmSuggestion] = useState(false);
  const [targetOverride, setTargetOverride] = useState<"suggestion" | CorrectionTarget>("suggestion");
  const [candidateLesson, setCandidateLesson] = useState("");
  const [suspectRagExperience, setSuspectRagExperience] = useState(false);
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, string>>({});
  const [revisionDrafts, setRevisionDrafts] = useState<Record<string, string>>({});
  const client = useAppQueryClient();
  const selectedScene = scenes.find((scene) => scene.sceneOrder === sceneOrder) ?? scenes[0];
  const qualityKey = videoWorkflowKeys.sceneQuality(runId, video.id, selectedScene?.sceneOrder ?? null);
  const summaryKey = videoWorkflowKeys.videoQualitySummary(runId, video.id);
  const summary = useQuery({
    queryKey: summaryKey,
    queryFn: () => getVideoQualitySummary({ runId, videoId: video.id }),
    enabled: Boolean(runId && video.id),
    suppressErrorToast: true,
    refetchInterval: (query) => ["queued", "running"].includes(query.state.data?.status ?? "") || query.state.data?.scenes.some((scene) => ["queued", "running"].includes(scene.status)) ? 3_000 : false,
    refetchIntervalInBackground: true,
  });
  const quality = useQuery({
    queryKey: qualityKey,
    queryFn: () => getVideoSceneQuality({ runId, videoId: video.id, sceneOrder: selectedScene!.sceneOrder }),
    enabled: selectedScene !== undefined,
    suppressErrorToast: true,
    refetchInterval: (query) => ["queued", "running"].includes(query.state.data?.evaluation?.status ?? "") ? 3_000 : false,
    refetchIntervalInBackground: true,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: qualityKey }),
      client.invalidateQueries({ queryKey: summaryKey }),
    ]);
  };
  const evaluation = useMutation({
    mutationFn: evaluateVideoScene,
    onSuccess: async () => { await refresh(); showToast("success", t("workflowMedia.quality.evaluationQueued")); },
  });
  const review = useMutation({
    mutationFn: saveVideoSceneReview,
    onSuccess: async () => {
      await refresh();
      setDescription("");
      setCandidateLesson("");
      setConfirmSuggestion(false);
      setTargetOverride("suggestion");
      showToast("success", t("workflowMedia.quality.reviewSaved"));
    },
  });
  const lesson = useMutation({
    mutationFn: setVideoExperienceStatus,
    onSuccess: async (saved) => { setLessonStatuses((current) => ({ ...current, [saved.lessonId]: saved.status })); await refresh(); showToast("success", t("workflowMedia.quality.lessonUpdated")); },
  });
  const revision = useMutation({
    mutationFn: reviseVideoExperience,
    onSuccess: async () => { await refresh(); showToast("success", t("workflowMedia.quality.revisionCreated")); },
  });

  const technical = objectValue(summary.data?.technical);
  const hasTechnical = Object.keys(technical).length > 0;
  const width = numberValue(technical.width);
  const height = numberValue(technical.height);
  const bytes = numberValue(technical.bytes);
  const technicalRows = [
    { label: t("workflowMedia.quality.technical.duration"), value: technicalText(technical.durationSeconds, notRecorded, t("workflowMedia.quality.secSuffix")) },
    { label: t("workflowMedia.quality.technical.resolution"), value: width !== null && height !== null ? `${width} × ${height}` : notRecorded },
    { label: t("workflowMedia.quality.technical.frameRate"), value: technicalText(technical.fps, notRecorded, " fps") },
    { label: t("workflowMedia.quality.technical.codec"), value: typeof technical.codec === "string" ? technical.codec.toUpperCase() : notRecorded },
    { label: t("workflowMedia.quality.technical.pixelFormat"), value: typeof technical.pixelFormat === "string" ? technical.pixelFormat : notRecorded },
    { label: t("workflowMedia.quality.technical.fileSize"), value: bytes !== null ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : notRecorded },
    { label: t("workflowMedia.quality.technical.audio"), value: typeof technical.hasAudio === "boolean" ? technical.hasAudio ? t("workflowMedia.quality.technical.present") : t("workflowMedia.quality.technical.noAudio") : notRecorded },
    { label: t("workflowMedia.quality.technical.fullDecode"), value: typeof technical.fullDecode === "boolean" ? technical.fullDecode ? t("workflowMedia.quality.technical.passed") : t("workflowMedia.quality.technical.failed") : notRecorded },
  ];
  const etsy = summary.data?.etsyCompliance;
  const sceneStates = scenes.map((scene) => {
    const saved = summary.data?.scenes.find((item) => item.sceneOrder === scene.sceneOrder);
    const current = quality.data?.sceneOrder === scene.sceneOrder ? quality.data.evaluation : null;
    return { scene, status: saved?.status ?? current?.status ?? "not_applicable", metrics: saved?.metrics ?? current?.metrics ?? {} };
  });
  const isChecking = sceneStates.some(({ status }) => status === "running" || status === "queued") || ["running", "queued"].includes(summary.data?.status ?? "");
  const hasIncompleteScenes = sceneStates.some(({ status }) => status !== "completed");
  const failedPolicy = etsy?.status === "fail" || technical.fullDecode === false || summary.data?.status === "fail";
  const missingPolicy = !etsy || typeof technical.fullDecode !== "boolean";
  const overall: { label: string; tone: QualityTone; detail: string } = failedPolicy
    ? { label: t("workflowMedia.quality.overall.fail"), tone: "fail", detail: t("workflowMedia.quality.overall.failDetail") }
    : isChecking ? { label: t("workflowMedia.quality.overall.checking"), tone: "pending", detail: t("workflowMedia.quality.overall.checkingDetail") }
    : missingPolicy ? { label: t("workflowMedia.quality.overall.needsReview"), tone: "warning", detail: t("workflowMedia.quality.overall.missingDetail") }
    : hasIncompleteScenes ? { label: t("workflowMedia.quality.overall.needsReview"), tone: "warning", detail: t("workflowMedia.quality.overall.incompleteDetail") }
    : etsy?.status === "pass_with_warning" ? { label: t("workflowMedia.quality.overall.passWithWarnings"), tone: "warning", detail: t("workflowMedia.quality.overall.passWithWarningsDetail") }
    : { label: t("workflowMedia.quality.overall.pass"), tone: "pass", detail: t("workflowMedia.quality.overall.passDetail") };
  const etsyChecks = etsy?.checks.filter((check) => !HIDDEN_ETSY_CHECKS.has(check.key)) ?? [];
  const etsyToReview = etsyChecks.filter((check) => ["warning", "pass_with_warning", "uncertain", "fail", "failed"].includes(check.status)).length;
  const etsyPassed = etsyChecks.filter((check) => statusTone(check.status) === "pass").length;
  const OverallIcon = toneIcon(overall.tone);
  const qualitySummary = summary.data ? (
    <div className="bg-card overflow-hidden rounded-xl border">
      {/* The title row never wraps (icon, title, status); the sentence under it lines up with the title at any width. */}
      <div className="bg-muted/30 space-y-1 border-b px-4 py-3" role="status" aria-atomic="true">
        <div className="flex items-center gap-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${toneChipClasses[overall.tone]}`}>
            <OverallIcon className="size-4" aria-hidden="true" />
          </span>
          <h5 className="min-w-0 flex-1 truncate text-sm font-semibold">{t("workflowMedia.quality.finalVideoQuality")}</h5>
          <StatusPill label={overall.label} tone={overall.tone} />
        </div>
        <p className="text-muted-foreground pl-11 text-xs leading-relaxed">{overall.detail}</p>
      </div>
      <div className="space-y-4 p-4 text-xs">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h5 className="text-sm font-semibold">{t("workflowMedia.quality.etsyChecks")}</h5>
            {etsy ? (
              <span className="text-muted-foreground tabular-nums">
                {t("workflowMedia.quality.passedCount", { count: etsyPassed })}{etsyToReview > 0 && <> · <span className="font-medium text-amber-700 dark:text-amber-400">{t("workflowMedia.quality.toReviewCount", { count: etsyToReview })}</span></>}
              </span>
            ) : (
              <StatusPill label={t("workflowMedia.quality.notChecked")} tone="neutral" />
            )}
          </div>
          {etsy ? (
            <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
              {etsyChecks.map((check) => {
                const tone = statusTone(check.status);
                const Icon = etsyIcons[check.key] ?? Film;
                const StatusIcon = checkIcon(tone);
                return (
                  <li key={check.key} className={cn("flex items-start gap-3 px-3 py-2.5", toneRowClasses[tone])}>
                    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1 sm:flex sm:gap-4">
                      <span className="block font-medium sm:w-32 sm:shrink-0">{t(`workflowMedia.quality.etsy.${check.key}`, { defaultValue: etsyLabels[check.key] ?? display(check.key) })}</span>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed sm:mt-0">{check.detail}</p>
                    </div>
                    <span className="mt-0.5 shrink-0">
                      <StatusIcon className={cn("size-4", toneIconTextClasses[tone])} aria-hidden="true" />
                      <span className="sr-only">{check.status === "info" ? t("workflowMedia.quality.info") : display(check.status)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-2 leading-relaxed">{t("workflowMedia.quality.noEtsyResult")}</p>
          )}
        </div>
        <details className="group border-t pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {t("workflowMedia.quality.technicalDetails")}
            <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          {hasTechnical ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {technicalRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 border-b border-dashed pb-2">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right font-medium tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground mt-2">{t("workflowMedia.quality.noTechnicalResult")}</p>
          )}
        </details>
      </div>
    </div>
  ) : <p className="text-muted-foreground text-xs">{summary.isError ? t("workflowMedia.quality.loadError") : t("workflowMedia.quality.loading")}</p>;

  if (scenes.length === 0) return (
    <section className="space-y-3 border-t pt-4" aria-labelledby="video-quality-title">
      <h4 id="video-quality-title" className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4" aria-hidden="true" /> {t("workflowMedia.quality.videoQuality")}</h4>
      {qualitySummary}
    </section>
  );

  const submit = () => {
    if (!selectedScene) return;
    const startMilliseconds = secondsToMilliseconds(startSeconds);
    const endMilliseconds = secondsToMilliseconds(endSeconds);
    if (!Number.isFinite(startMilliseconds) || !Number.isFinite(endMilliseconds) || startMilliseconds < 0 || endMilliseconds < startMilliseconds) {
      showToast("warning", t("workflowMedia.quality.invalidTimes"));
      return;
    }
    if (!description.trim()) { showToast("warning", t("workflowMedia.quality.describeObservation")); return; }
    review.mutate({
      runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder, startMilliseconds, endMilliseconds,
      category, severity, presentInSourceImage, description: description.trim(), confirmSuggestion,
      suspectRagExperience,
      ...(targetOverride === "suggestion" ? {} : { targetOverride }),
      ...(candidateLesson.trim() ? { candidateLesson: candidateLesson.trim() } : {}),
    });
  };

  return (
    <section className="space-y-4 border-t pt-4" aria-labelledby="scene-quality-title">
      <div>
        <div>
          <h4 id="scene-quality-title" className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4" aria-hidden="true" /> {t("workflowMedia.quality.aiVideoQuality")}</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t("workflowMedia.quality.aiVideoQualityDescription")}</p>
        </div>
      </div>

      {qualitySummary}

      <div className="space-y-2">
        <div><h5 className="text-sm font-semibold">{t("workflowMedia.quality.sceneEvaluations")}</h5><p className="text-muted-foreground mt-1 text-xs">{t("workflowMedia.quality.sceneEvaluationsDescription")}</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t("workflowMedia.quality.chooseScene")}>
          {sceneStates.map(({ scene, status, metrics }) => {
            const selected = selectedScene.sceneOrder === scene.sceneOrder;
            const tone = status === "completed" ? "pass" : statusTone(status);
            const score = status === "completed" || status === "uncertain" ? sceneOverall(metrics) : null;
            return <button key={scene.sceneOrder} type="button" aria-pressed={selected} onClick={() => setSceneOrder(scene.sceneOrder)} className={`focus-visible:ring-ring flex min-h-20 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><span className="min-w-0"><span className="block text-sm font-semibold">{t("workflowMedia.quality.sceneTitle", { scene: scene.sceneOrder + 1 })}</span><span className="text-muted-foreground block truncate text-xs">{scene.role ? t(`workflowMedia.assetRoles.${scene.role}`, { defaultValue: scene.role }) : t("workflowMedia.quality.aiScene")}</span><span className="mt-1 block"><StatusPill label={sceneStatusLabel(status)} tone={tone} /></span></span>{score !== null && <span className="shrink-0 text-right"><span className="block text-lg font-semibold tabular-nums">{Math.round(score * 100)}<span className="text-muted-foreground text-xs font-normal">/100</span></span><span className="text-muted-foreground block text-[11px]">{t("workflowMedia.quality.vbenchGuide")}</span></span>}</button>;
          })}
        </div>
      </div>

      <div className="bg-muted/35 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3">
        <div className="text-xs"><span className="text-muted-foreground">{t("workflowMedia.quality.sceneEvaluation", { scene: selectedScene.sceneOrder + 1 })}</span><span className="font-semibold">{sceneStatusLabel(quality.data?.evaluation?.status ?? "not_applicable")}</span>{quality.data?.evaluation?.detail && <p className="text-muted-foreground mt-1 max-w-xl leading-relaxed">{quality.data.evaluation.detail}</p>}</div>
        <div className="flex flex-wrap items-center gap-2">
        {quality.data?.evaluation && Object.keys(quality.data.evaluation.metrics).length > 0 && <SceneQualityResult key={selectedScene.sceneOrder} metrics={quality.data.evaluation.metrics} sceneNumber={selectedScene.sceneOrder + 1} />}
        <Button type="button" variant="outline" size="sm" disabled={evaluation.isPending || !selectedScene || ["queued", "running"].includes(quality.data?.evaluation?.status ?? "")} onClick={() => selectedScene && evaluation.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder })}>
          <RefreshCw className={evaluation.isPending ? "animate-spin" : ""} aria-hidden="true" /> {evaluation.isPending ? t("workflowMedia.quality.queueing") : t("workflowMedia.quality.runAgain")}
        </Button>
        </div>
      </div>

      {showObservationForm && <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="scene-review-start">{t("workflowMedia.quality.startSeconds")}</Label><Input id="scene-review-start" type="number" min="0" step="0.1" value={startSeconds} onChange={(event) => setStartSeconds(event.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="scene-review-end">{t("workflowMedia.quality.endSeconds")}</Label><Input id="scene-review-end" type="number" min="0" step="0.1" value={endSeconds} onChange={(event) => setEndSeconds(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t("workflowMedia.quality.issueType")}</Label><Select value={category} onValueChange={(value) => setCategory(value as VideoReviewCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{t(`workflowMedia.quality.categories.${item.value}`, { defaultValue: item.label })}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>{t("workflowMedia.quality.severity")}</Label><Select value={severity} onValueChange={(value) => setSeverity(value as VideoReviewSeverity)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{severities.map((value) => <SelectItem key={value} value={value} className="capitalize">{t(`workflowMedia.quality.severities.${value}`, { defaultValue: value })}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="flex items-center gap-2"><Checkbox id="scene-review-source" checked={presentInSourceImage} onCheckedChange={(value) => setPresentInSourceImage(value === true)} /><Label htmlFor="scene-review-source" className="text-xs leading-relaxed">{t("workflowMedia.quality.presentInSource")}</Label></div>
      <div className="space-y-1.5"><Label htmlFor="scene-review-description">{t("workflowMedia.quality.observation")}</Label><Textarea id="scene-review-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder={t("workflowMedia.quality.observationPlaceholder")} className="min-h-20" /></div>
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <div className="space-y-2"><div className="flex items-center gap-2"><Checkbox id="scene-review-confirm" checked={confirmSuggestion} onCheckedChange={(value) => setConfirmSuggestion(value === true)} /><Label htmlFor="scene-review-confirm" className="text-xs">{t("workflowMedia.quality.confirmSuggestion")}</Label></div><p className="text-muted-foreground text-[11px] leading-relaxed">{t("workflowMedia.quality.confirmSuggestionHint")}</p></div>
        <div className="space-y-1.5"><Label>{t("workflowMedia.quality.overrideTarget")}</Label><Select value={targetOverride} onValueChange={(value) => setTargetOverride(value as "suggestion" | CorrectionTarget)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="suggestion">{t("workflowMedia.quality.useSuggestion")}</SelectItem>{targets.map((item) => <SelectItem key={item.value} value={item.value}>{t(`workflowMedia.quality.targets.${item.value}`, { defaultValue: item.label })}</SelectItem>)}</SelectContent></Select></div>
      </div>
      {selectedScene.aiPromptTrace?.ragStatus === "applied" && <div className="flex items-center gap-2"><Checkbox id="scene-review-rag" checked={suspectRagExperience} onCheckedChange={(value) => setSuspectRagExperience(value === true)} /><Label htmlFor="scene-review-rag" className="text-xs leading-relaxed">{t("workflowMedia.quality.suspectRag")}</Label></div>}
      <div className="space-y-1.5"><Label htmlFor="scene-review-lesson">{t("workflowMedia.quality.candidateLesson")}</Label><Textarea id="scene-review-lesson" value={candidateLesson} onChange={(event) => setCandidateLesson(event.target.value)} maxLength={1500} placeholder={t("workflowMedia.quality.candidateLessonPlaceholder")} className="min-h-16" /><p className="text-muted-foreground text-[11px]">{t("workflowMedia.quality.lessonsNote")}</p></div>
      <Button type="button" size="sm" disabled={review.isPending} onClick={submit}>{review.isPending ? t("workflowMedia.quality.saving") : t("workflowMedia.quality.saveObservation")}</Button>
      </>}

      {quality.data && quality.data.reviews.length > 0 && <div className="space-y-2"><h5 className="text-xs font-semibold">{t("workflowMedia.quality.savedObservations")}</h5>{quality.data.reviews.map((item) => { const lessonStatus = item.lessonId ? (lessonStatuses[item.lessonId] ?? item.lessonStatus ?? "candidate") : null; return <article key={item.id} className="rounded-lg border p-3 text-xs"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{(item.startMilliseconds / 1000).toFixed(1)}-{(item.endMilliseconds / 1000).toFixed(1)}s</Badge><Badge variant="outline" className="capitalize">{t(`workflowMedia.quality.categoryNames.${item.category}`, { defaultValue: display(item.category) })}</Badge><Badge variant="outline" className="capitalize">{t(`workflowMedia.quality.severities.${item.severity}`, { defaultValue: item.severity })}</Badge><span className="text-muted-foreground capitalize">{item.status}</span></div><p className="mt-2 leading-relaxed">{item.description}</p><p className="text-muted-foreground mt-2 leading-relaxed">{t("workflowMedia.quality.suggestion")} <span className="text-foreground font-medium">{t(`workflowMedia.quality.targetNames.${item.suggestion.target}`, { defaultValue: display(item.suggestion.target) })}</span> · {item.suggestion.reason} ({item.suggestion.confidence})</p>{item.confirmedTarget && <p className="text-muted-foreground mt-1">{t("workflowMedia.quality.confirmedTarget")} <span className="text-foreground font-medium">{t(`workflowMedia.quality.targetNames.${item.confirmedTarget}`, { defaultValue: display(item.confirmedTarget) })}</span></p>}{item.lessonId && <div className="bg-muted/20 mt-3 space-y-2 rounded border p-2"><p className="text-muted-foreground">{t("workflowMedia.quality.lessonRevision", { revision: item.lessonRevision ?? "1", content: item.lessonContent ?? t("workflowMedia.quality.legacyLesson") })}</p><div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">{t("workflowMedia.quality.lessonStatus", { status: lessonStatus ? t(`workflowMedia.quality.lessonStatuses.${lessonStatus}`, { defaultValue: lessonStatus }) : lessonStatus })}</span><Button type="button" size="sm" variant="outline" disabled={lesson.isPending || lessonStatus === "verified"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "verified" })}>{t("workflowMedia.quality.verify")}</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "rejected"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "rejected" })}>{t("workflowMedia.quality.reject")}</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "retired"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "retired" })}>{t("workflowMedia.quality.retire")}</Button></div><Textarea aria-label={t("workflowMedia.quality.revisionForLesson", { id: item.lessonId })} value={revisionDrafts[item.lessonId!] ?? item.lessonContent ?? ""} onChange={(event) => setRevisionDrafts((current) => ({ ...current, [item.lessonId!]: event.target.value }))} maxLength={1500} className="min-h-16" /><Button type="button" size="sm" variant="secondary" disabled={revision.isPending || !(revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim()} onClick={() => revision.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder, lessonId: item.lessonId!, reviewId: item.id, content: (revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim() })}>{t("workflowMedia.quality.createRevision")}</Button></div>}</article>})}</div>}
    </section>
  );
};
