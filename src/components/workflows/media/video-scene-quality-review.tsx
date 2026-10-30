"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";

import { evaluateVideoScene, getVideoSceneQuality, reviseVideoExperience, saveVideoSceneReview, setVideoExperienceStatus, videoWorkflowKeys } from "@/api/video-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export const VideoSceneQualityReview = ({ runId, video }: { runId: string; video: PromoVideo }) => {
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
  const quality = useQuery({
    queryKey: qualityKey,
    queryFn: () => getVideoSceneQuality({ runId, videoId: video.id, sceneOrder: selectedScene!.sceneOrder }),
    enabled: selectedScene !== undefined,
    suppressErrorToast: true,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: qualityKey });
  };
  const evaluation = useMutation({
    mutationFn: evaluateVideoScene,
    onSuccess: async () => { await refresh(); showToast("success", "Scene evaluation was saved."); },
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

  if (scenes.length === 0) return null;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id="scene-quality-title" className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="size-4" aria-hidden="true" /> Evaluate AI scene</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">Run local OCR/VBench evidence, then record your observation. Evidence suggests where to investigate; you decide the final target.</p>
        </div>
        <Select value={String(selectedScene.sceneOrder)} onValueChange={(value) => setSceneOrder(Number(value))}>
          <SelectTrigger className="w-40" aria-label="AI scene"><SelectValue /></SelectTrigger>
          <SelectContent>{scenes.map((scene) => <SelectItem key={scene.sceneOrder} value={String(scene.sceneOrder)}>Scene {scene.sceneOrder + 1} · {scene.aiTemplateCode ?? "AI"}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-muted/35 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3">
        <div className="text-xs"><span className="text-muted-foreground">Machine evidence: </span><span className="font-semibold capitalize">{quality.data?.evaluation?.status ?? "not run"}</span>{quality.data?.evaluation?.detail && <p className="text-muted-foreground mt-1 max-w-xl leading-relaxed">{quality.data.evaluation.detail}</p>}</div>
        <Button type="button" variant="outline" size="sm" disabled={evaluation.isPending || !selectedScene} onClick={() => selectedScene && evaluation.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder })}>
          <RefreshCw className={evaluation.isPending ? "animate-spin" : ""} aria-hidden="true" /> {evaluation.isPending ? "Evaluating…" : "Evaluate scene"}
        </Button>
      </div>
      {quality.data?.evaluation && Object.keys(quality.data.evaluation.metrics).length > 0 && <details className="rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-medium">OCR/VBench metrics</summary><pre className="bg-muted mt-2 overflow-auto rounded p-2 text-[11px] leading-relaxed">{JSON.stringify(quality.data.evaluation.metrics, null, 2)}</pre></details>}

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

      {quality.data && quality.data.reviews.length > 0 && <div className="space-y-2"><h5 className="text-xs font-semibold">Saved observations</h5>{quality.data.reviews.map((item) => { const lessonStatus = item.lessonId ? (lessonStatuses[item.lessonId] ?? item.lessonStatus ?? "candidate") : null; return <article key={item.id} className="rounded-lg border p-3 text-xs"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{(item.startMilliseconds / 1000).toFixed(1)}-{(item.endMilliseconds / 1000).toFixed(1)}s</Badge><Badge variant="outline" className="capitalize">{display(item.category)}</Badge><Badge variant="outline" className="capitalize">{item.severity}</Badge><span className="text-muted-foreground capitalize">{item.status}</span></div><p className="mt-2 leading-relaxed">{item.description}</p><p className="text-muted-foreground mt-2 leading-relaxed">Suggestion: <span className="font-medium text-foreground">{display(item.suggestion.target)}</span> · {item.suggestion.reason} ({item.suggestion.confidence})</p>{item.confirmedTarget && <p className="text-muted-foreground mt-1">Confirmed target: <span className="font-medium text-foreground">{display(item.confirmedTarget)}</span></p>}{item.lessonId && <div className="mt-3 space-y-2 rounded border bg-muted/20 p-2"><p className="text-muted-foreground">Lesson revision {item.lessonRevision ?? "1"}: {item.lessonContent ?? "Content is not available for this legacy lesson."}</p><div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">Status: {lessonStatus}</span><Button type="button" size="sm" variant="outline" disabled={lesson.isPending || lessonStatus === "verified"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "verified" })}>Verify</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "rejected"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "rejected" })}>Reject</Button><Button type="button" size="sm" variant="ghost" disabled={lesson.isPending || lessonStatus === "retired"} onClick={() => lesson.mutate({ lessonId: item.lessonId!, status: "retired" })}>Retire</Button></div><Textarea aria-label={`Revision for lesson ${item.lessonId}`} value={revisionDrafts[item.lessonId!] ?? item.lessonContent ?? ""} onChange={(event) => setRevisionDrafts((current) => ({ ...current, [item.lessonId!]: event.target.value }))} maxLength={1500} className="min-h-16" /><Button type="button" size="sm" variant="secondary" disabled={revision.isPending || !(revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim()} onClick={() => revision.mutate({ runId, videoId: video.id, sceneOrder: selectedScene.sceneOrder, lessonId: item.lessonId!, reviewId: item.id, content: (revisionDrafts[item.lessonId!] ?? item.lessonContent ?? "").trim() })}>Create revised candidate</Button></div>}</article>})}</div>}
    </section>
  );
};
