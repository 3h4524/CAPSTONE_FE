"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BarChart3, CheckCircle2, ClipboardCheck, Clock3, Film, RefreshCw, XCircle } from "lucide-react";

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
const technicalText = (value: unknown, suffix = "") => {
  const number = numberValue(value);
  return number === null ? "Not recorded" : `${Number(number.toFixed(2))}${suffix}`;
};
const etsyLabels: Record<string, string> = {
  decode: "Video decoding", duration: "Duration", fileSize: "File size", format: "File format",
  resolution: "Resolution", aspectRatio: "Aspect ratio", audio: "Audio",
};
const sceneMetrics = [
  { key: "subject_consistency", label: "Subject consistency", description: "Stability of the subject between frames." },
  { key: "background_consistency", label: "Background consistency", description: "Stability of the background between frames." },
  { key: "motion_smoothness", label: "Motion smoothness", description: "Continuity of movement across frames." },
  { key: "imaging_quality", label: "Image quality", description: "Visual quality of the frames." },
  { key: "aesthetic_quality", label: "Aesthetic quality", description: "Overall visual presentation." },
];

type QualityTone = "pass" | "fail" | "warning" | "pending" | "neutral";
const toneClasses: Record<QualityTone, string> = {
  pass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  fail: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  pending: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  neutral: "bg-muted text-muted-foreground",
};
const statusTone = (status: string): QualityTone => {
  if (["pass", "passed"].includes(status)) return "pass";
  if (["fail", "failed"].includes(status)) return "fail";
  if (["warning", "pass_with_warning", "uncertain"].includes(status)) return "warning";
  if (["queued", "running"].includes(status)) return "pending";
  return "neutral";
};
function StatusPill({ label, tone }: { label: string; tone: QualityTone }) {
  const Icon = tone === "pass" ? CheckCircle2 : tone === "fail" ? XCircle : tone === "warning" ? AlertCircle : Clock3;
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}><Icon className="size-3.5" aria-hidden="true" />{label}</span>;
}
const sceneStatusLabel = (status: string) => ({ completed: "Scored", failed: "Check failed", running: "Scoring", queued: "Queued", skipped: "Skipped", uncertain: "Incomplete", not_applicable: "Not scored" }[status] ?? "Not scored");
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
  const percentage = Math.round(score * 100);
  return <div className="relative grid size-20 shrink-0 place-items-center" aria-label={`VBench average ${percentage} out of 100`}>
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
  const vbench = objectValue(metrics.vbench);
  const dimensions = objectValue(vbench.dimensions);
  const ocr = objectValue(metrics.paddleOcr);
  const fidelity = objectValue(metrics.inputFidelity);
  const ocrMetrics = [
    { key: "sourceTokenRecall", label: "Source text recall" },
    { key: "frameTextConsistency", label: "Text consistency between frames" },
    { key: "meanRecognitionConfidence", label: "OCR confidence" },
  ];
  return (
    <div className="space-y-5 text-sm">
      <div><h5 className="font-semibold">Scene quality metrics</h5><p className="text-muted-foreground mt-1 text-xs leading-relaxed">Reference bands on a 0–1 scale: High ≥ 0.80, Medium ≥ 0.50, Low &lt; 0.50. These are uncalibrated guides, not pass/fail results; metrics are not directly comparable.</p></div>
      {Object.keys(vbench).length > 0 && <div className="space-y-1">
        <p className="font-medium">VBench</p>
        <dl className="space-y-4 pt-2">{sceneMetrics.map(({ key, label, description }) => {
          const score = numberValue(vbench[`${key}Score`]);
          const status = objectValue(dimensions[key]).status;
          const band = scoreBand(score);
          return <div key={key} className="space-y-2"><div className="flex items-start justify-between gap-3"><div><dt className="font-medium">{label}</dt><dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</dd></div><div className="shrink-0 text-right"><span className="font-semibold tabular-nums">{score !== null ? score.toFixed(4) : typeof status === "string" ? display(status) : "Not available"}</span>{band && <p className={`mt-0.5 text-xs ${bandColors[band].text}`}>{band} · guide</p>}</div></div><MetricBar score={score} classified /></div>;
        })}</dl>
      </div>}
      {Object.keys(fidelity).length > 0 && <div className="space-y-1 border-t pt-3">
        <p className="font-medium">Input image fidelity</p>
        <p className="text-muted-foreground text-xs leading-relaxed">Compares the scene with its reconstructed input image. Scores are uncalibrated guides and do not verify every detail or letter.</p>
        {[
          { key: "i2vSubject", label: "Subject and input alignment", description: "VBench-I2V combines similarity to the input with consistency between video frames." },
          { key: "artwork", label: "Artwork similarity", description: "Compares the marked artwork in frames where it can be tracked." },
        ].map(({ key, label, description }) => {
          const metric = objectValue(fidelity[key]);
          const score = numberValue(metric.score);
          return <div key={key} className="space-y-2 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{label}</p><p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{typeof metric.reason === "string" ? metric.reason : description}</p>{typeof metric.trackedFrameCount === "number" && typeof metric.sampledFrameCount === "number" && <p className="text-muted-foreground mt-1 text-xs">Tracked in {metric.trackedFrameCount} of {metric.sampledFrameCount} sampled frames.</p>}</div><div className="shrink-0 text-right"><span className="font-semibold tabular-nums">{score === null ? typeof metric.status === "string" ? display(metric.status) : "Not available" : score.toFixed(4)}</span>{score !== null && typeof metric.status === "string" && metric.status !== "completed" && <p className="text-muted-foreground mt-1 text-xs">{display(metric.status)}</p>}</div></div><MetricBar score={score} /></div>;
        })}
      </div>}
      {Object.keys(ocr).length > 0 && <div className="space-y-1 border-t pt-3">
        <p className="font-medium">Text recognition <span className="text-muted-foreground font-normal">{ocr.status === "uncertain" ? "· Not enough evidence" : typeof ocr.status === "string" ? `· ${display(ocr.status)}` : ""}</span></p>
        <p className="text-muted-foreground text-xs">OCR is a guide only. Text that is hidden or hard to read may not be assessed.</p>
        {typeof ocr.framesWithTextMatch === "number" && typeof ocr.sampledFrameCount === "number" && <p className="text-muted-foreground text-xs">Recognized at least one source word in {ocr.framesWithTextMatch} of {ocr.sampledFrameCount} sampled frames.</p>}
        {typeof ocr.reason === "string" && <p className="text-muted-foreground">{ocr.reason}</p>}
        {ocrMetrics.map(({ key, label }) => { const score = numberValue(ocr[key]); const band = scoreBand(score); return score === null ? null : <div key={key} className="space-y-2 py-2"><div className="flex justify-between gap-3"><span>{label}</span><span className="shrink-0 font-semibold tabular-nums">{score.toFixed(4)}{band && <span className={`ml-2 text-xs font-normal ${bandColors[band].text}`}>{band} · guide</span>}</span></div><MetricBar score={score} classified /></div>; })}
      </div>}
      <details><summary className="text-muted-foreground cursor-pointer">View raw metrics</summary><pre className="bg-muted mt-2 overflow-auto rounded p-2 text-[11px] leading-relaxed">{JSON.stringify(metrics, null, 2)}</pre></details>
    </div>
  );
}

function SceneQualityResult({ metrics, sceneNumber }: { metrics: Record<string, unknown>; sceneNumber: number }) {
  const score = sceneOverall(metrics);
  return <Dialog>
    <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><BarChart3 aria-hidden="true" /> View details</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle>Scene {sceneNumber} quality details</DialogTitle>
        <DialogDescription>Explore the measurements for this AI scene.</DialogDescription>
      </DialogHeader>
      <div className="bg-muted/40 flex items-center gap-4 rounded-lg p-4">
        {score !== null && <QualityScore score={score} />}
        <div className="space-y-1"><p className="text-sm font-semibold">{score === null ? "Overall score unavailable" : "Overall scene score · guide"}</p><p className="text-muted-foreground text-xs leading-relaxed">Equal average of the five VBench scores, multiplied by 100. The metrics measure different things and are not calibrated; this is not a pass/fail result. Text recognition and input fidelity are shown separately.</p></div>
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
    onSuccess: async () => { await refresh(); showToast("success", "Scene evaluation was queued."); },
  });
  const review = useMutation({
    mutationFn: saveVideoSceneReview,
    onSuccess: async () => {
      await refresh();
      setDescription("");
      setCandidateLesson("");
      setConfirmSuggestion(false);
      setTargetOverride("suggestion");
      showToast("success", "Review saved. Confirm a lesson separately before it affects future prompts.");
    },
  });
  const lesson = useMutation({
    mutationFn: setVideoExperienceStatus,
    onSuccess: async (saved) => { setLessonStatuses((current) => ({ ...current, [saved.lessonId]: saved.status })); await refresh(); showToast("success", "Lesson status updated."); },
  });
  const revision = useMutation({
    mutationFn: reviseVideoExperience,
    onSuccess: async () => { await refresh(); showToast("success", "A new candidate lesson revision was created."); },
  });

  const technical = objectValue(summary.data?.technical);
  const hasTechnical = Object.keys(technical).length > 0;
  const width = numberValue(technical.width);
  const height = numberValue(technical.height);
  const bytes = numberValue(technical.bytes);
  const technicalRows = [
    { label: "Duration", value: technicalText(technical.durationSeconds, " sec") },
    { label: "Resolution", value: width !== null && height !== null ? `${width} × ${height}` : "Not recorded" },
    { label: "Frame rate", value: technicalText(technical.fps, " fps") },
    { label: "Codec", value: typeof technical.codec === "string" ? technical.codec.toUpperCase() : "Not recorded" },
    { label: "Pixel format", value: typeof technical.pixelFormat === "string" ? technical.pixelFormat : "Not recorded" },
    { label: "File size", value: bytes !== null ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : "Not recorded" },
    { label: "Audio", value: typeof technical.hasAudio === "boolean" ? technical.hasAudio ? "Present" : "No audio" : "Not recorded" },
    { label: "Full video decoding", value: typeof technical.fullDecode === "boolean" ? technical.fullDecode ? "Passed" : "Failed" : "Not recorded" },
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
    ? { label: "Fail", tone: "fail", detail: "The final video has a failed technical or Etsy check." }
    : isChecking ? { label: "Checking", tone: "pending", detail: "Scene evaluation is still running. You can review the video while you wait." }
    : missingPolicy ? { label: "Needs review", tone: "warning", detail: "Some final video checks were not saved, so an overall pass cannot be confirmed." }
    : hasIncompleteScenes ? { label: "Needs review", tone: "warning", detail: "One or more scene evaluations are missing or could not finish." }
    : etsy?.status === "pass_with_warning" ? { label: "Pass with warnings", tone: "warning", detail: "The video passed required checks. Review the Etsy warnings below." }
    : { label: "Pass", tone: "pass", detail: "The saved technical and Etsy checks passed and scene evaluations are complete." };
  const qualitySummary = summary.data ? (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/30 space-y-2 p-4" role="status" aria-atomic="true">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Film className="size-4 text-muted-foreground" aria-hidden="true" /><h5 className="text-sm font-semibold">Final video quality</h5></div><StatusPill label={overall.label} tone={overall.tone} /></div>
        <p className="text-muted-foreground text-xs leading-relaxed">{overall.detail}</p>
      </div>
      <div className="space-y-4 p-4 text-xs">
        <div>
          <div className="flex items-center justify-between gap-2"><h5 className="text-sm font-semibold">Etsy listing checks</h5><StatusPill label={etsy ? display(etsy.status) : "Not checked"} tone={etsy ? statusTone(etsy.status) : "neutral"} /></div>
          {etsy ? <ul className="mt-2 divide-y">{etsy.checks.map((check) => <li key={check.key} className="flex items-start justify-between gap-3 py-2.5"><div><span className="font-medium">{etsyLabels[check.key] ?? display(check.key)}</span><p className="text-muted-foreground mt-0.5 leading-relaxed">{check.detail}</p></div><StatusPill label={check.status === "info" ? "Info" : display(check.status)} tone={statusTone(check.status)} /></li>)}</ul> : <p className="text-muted-foreground mt-2 leading-relaxed">No Etsy result was saved for this video. Older videos may not have been checked against these rules.</p>}
        </div>
        <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Technical details</summary>
          {hasTechnical ? <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">{technicalRows.map((row) => <div key={row.label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{row.label}</dt><dd className="text-right font-medium tabular-nums">{row.value}</dd></div>)}</dl> : <p className="text-muted-foreground mt-2">No technical result was saved for this video.</p>}
        </details>
      </div>
    </div>
  ) : <p className="text-muted-foreground text-xs">{summary.isError ? "Could not load the final video quality results." : "Loading final video quality results…"}</p>;

  if (scenes.length === 0) return (
    <section className="space-y-3 border-t pt-4" aria-labelledby="video-quality-title">
      <h4 id="video-quality-title" className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4" aria-hidden="true" /> Video quality</h4>
      {qualitySummary}
    </section>
  );

  const submit = () => {
    if (!selectedScene) return;
    const startMilliseconds = secondsToMilliseconds(startSeconds);
    const endMilliseconds = secondsToMilliseconds(endSeconds);
    if (!Number.isFinite(startMilliseconds) || !Number.isFinite(endMilliseconds) || startMilliseconds < 0 || endMilliseconds < startMilliseconds) {
      showToast("warning", "Enter a valid start and end time in seconds.");
      return;
    }
    if (!description.trim()) { showToast("warning", "Describe what you observed in this scene."); return; }
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
          <h4 id="scene-quality-title" className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4" aria-hidden="true" /> AI video quality</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">Review the final video checks, then inspect each scene below.</p>
        </div>
      </div>

      {qualitySummary}

      <div className="space-y-2">
        <div><h5 className="text-sm font-semibold">Scene evaluations</h5><p className="text-muted-foreground mt-1 text-xs">Scores are uncalibrated VBench averages. Choose a scene to view details.</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Choose a scene">
          {sceneStates.map(({ scene, status, metrics }) => {
            const selected = selectedScene.sceneOrder === scene.sceneOrder;
            const tone = status === "completed" ? "pass" : statusTone(status);
            const score = status === "completed" || status === "uncertain" ? sceneOverall(metrics) : null;
            return <button key={scene.sceneOrder} type="button" aria-pressed={selected} onClick={() => setSceneOrder(scene.sceneOrder)} className={`focus-visible:ring-ring flex min-h-20 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><span className="min-w-0"><span className="block text-sm font-semibold">Scene {scene.sceneOrder + 1}</span><span className="text-muted-foreground block truncate text-xs">{scene.role || "AI scene"}</span><span className="mt-1 block"><StatusPill label={sceneStatusLabel(status)} tone={tone} /></span></span>{score !== null && <span className="shrink-0 text-right"><span className="block text-lg font-semibold tabular-nums">{Math.round(score * 100)}<span className="text-muted-foreground text-xs font-normal">/100</span></span><span className="text-muted-foreground block text-[11px]">VBench · guide</span></span>}</button>;
          })}
        </div>
      </div>

      <div className="bg-muted/35 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3">
        <div className="text-xs"><span className="text-muted-foreground">Scene {selectedScene.sceneOrder + 1} evaluation: </span><span className="font-semibold">{sceneStatusLabel(quality.data?.evaluation?.status ?? "not_applicable")}</span>{quality.data?.evaluation?.detail && <p className="text-muted-foreground mt-1 max-w-xl leading-relaxed">{quality.data.evaluation.detail}</p>}</div>
        <div className="flex flex-wrap items-center gap-2">
        {quality.data?.evaluation && Object.keys(quality.data.evaluation.metrics).length > 0 && <SceneQualityResult key={selectedScene.sceneOrder} metrics={quality.data.evaluation.metrics} sceneNumber={selectedScene.sceneOrder + 1} />}
        <Button type="button" variant="outline" size="sm" disabled={evaluation.isPending || !selectedScene || ["queued", "running"].includes(quality.data?.evaluation?.status ?? "")} onClick={() => selectedScene && evaluation.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder })}>
          <RefreshCw className={evaluation.isPending ? "animate-spin" : ""} aria-hidden="true" /> {evaluation.isPending ? "Queueing…" : "Run again"}
        </Button>
        </div>
      </div>

      {showObservationForm && <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="scene-review-start">Start (seconds)</Label><Input id="scene-review-start" type="number" min="0" step="0.1" value={startSeconds} onChange={(event) => setStartSeconds(event.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="scene-review-end">End (seconds)</Label><Input id="scene-review-end" type="number" min="0" step="0.1" value={endSeconds} onChange={(event) => setEndSeconds(event.target.value)} /></div>
        <div className="space-y-1.5"><Label>Issue type</Label><Select value={category} onValueChange={(value) => setCategory(value as VideoReviewCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Severity</Label><Select value={severity} onValueChange={(value) => setSeverity(value as VideoReviewSeverity)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{severities.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="flex items-center gap-2"><Checkbox id="scene-review-source" checked={presentInSourceImage} onCheckedChange={(value) => setPresentInSourceImage(value === true)} /><Label htmlFor="scene-review-source" className="text-xs leading-relaxed">The problem is already visible in the selected source image.</Label></div>
      <div className="space-y-1.5"><Label htmlFor="scene-review-description">Observation</Label><Textarea id="scene-review-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Example: 2.3 seconds: the hand jerks while touching the collar." className="min-h-20" /></div>
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <div className="space-y-2"><div className="flex items-center gap-2"><Checkbox id="scene-review-confirm" checked={confirmSuggestion} onCheckedChange={(value) => setConfirmSuggestion(value === true)} /><Label htmlFor="scene-review-confirm" className="text-xs">Confirm the system suggestion after saving</Label></div><p className="text-muted-foreground text-[11px] leading-relaxed">Leave this unchecked to preserve the observation as a suggestion until there is enough evidence.</p></div>
        <div className="space-y-1.5"><Label>Override target</Label><Select value={targetOverride} onValueChange={(value) => setTargetOverride(value as "suggestion" | CorrectionTarget)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="suggestion">Use system suggestion</SelectItem>{targets.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
      </div>
      {selectedScene.aiPromptTrace?.ragStatus === "applied" && <div className="flex items-center gap-2"><Checkbox id="scene-review-rag" checked={suspectRagExperience} onCheckedChange={(value) => setSuspectRagExperience(value === true)} /><Label htmlFor="scene-review-rag" className="text-xs leading-relaxed">This issue appeared after the retrieved lesson was added, or the prompt appears conflicting or overly long.</Label></div>}
      <div className="space-y-1.5"><Label htmlFor="scene-review-lesson">Candidate lesson for RAG (optional)</Label><Textarea id="scene-review-lesson" value={candidateLesson} onChange={(event) => setCandidateLesson(event.target.value)} maxLength={1500} placeholder="A short prevention rule for comparable scenes. It stays a candidate until you verify it." className="min-h-16" /><p className="text-muted-foreground text-[11px]">Lessons are never created for source-image issues or unknown causes.</p></div>
      <Button type="button" size="sm" disabled={review.isPending} onClick={submit}>{review.isPending ? "Saving…" : "Save observation"}</Button>
      </>}

      {quality.data && quality.data.reviews.length > 0 && <div className="space-y-2"><h5 className="text-xs font-semibold">Saved observations</h5>{quality.data.reviews.map((item) => { const lessonStatus = item.lessonId ? (lessonStatuses[item.lessonId] ?? item.lessonStatus ?? "candidate") : null; return <article key={item.id} className="rounded-lg border p-3 text-xs"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{(item.startMilliseconds / 1000).toFixed(1)}-{(item.endMilliseconds / 1000).toFixed(1)}s</Badge><Badge variant="outline" className="capitalize">{display(item.category)}</Badge><Badge variant="outline" className="capitalize">{item.severity}</Badge><span className="text-muted-foreground capitalize">{item.status}</span></div><p className="mt-2 leading-relaxed">{item.description}</p><p className="text-muted-foreground mt-2 leading-relaxed">Suggestion: <span className="text-foreground font-medium">{display(item.suggestion.target)}</span> · {item.suggestion.reason} ({item.suggestion.confidence})</p>{item.confirmedTarget && <p className="text-muted-foreground mt-1">Confirmed target: <span className="text-foreground font-medium">{display(item.confirmedTarget)}</span></p>}{item.lessonId && <div className="bg-muted/20 mt-3 space-y-2 rounded border p-2"><p className="text-muted-foreground">Lesson revision {item.lessonRevision ?? "1"}: {item.lessonContent ?? "Content is not available for this legacy lesson."}</p><div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">Status: {lessonStatus}</span><Button type="button" size="sm" variant="outline" disabled={lesson.isPending || lessonStatus === "verified"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "verified" })}>Verify</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "rejected"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "rejected" })}>Reject</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "retired"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "retired" })}>Retire</Button></div><Textarea aria-label={`Revision for lesson ${item.lessonId}`} value={revisionDrafts[item.lessonId!] ?? item.lessonContent ?? ""} onChange={(event) => setRevisionDrafts((current) => ({ ...current, [item.lessonId!]: event.target.value }))} maxLength={1500} className="min-h-16" /><Button type="button" size="sm" variant="secondary" disabled={revision.isPending || !(revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim()} onClick={() => revision.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder, lessonId: item.lessonId!, reviewId: item.id, content: (revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim() })}>Create revised candidate</Button></div>}</article>})}</div>}
    </section>
  );
};
