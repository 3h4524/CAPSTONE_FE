import { redirect } from "next/navigation";

type BatchJobPageProps = {
  params: Promise<{ jobId: string }>;
};

// A job is shown on the workflow canvas, where its designs are also reviewed. This address stays so that
// links made before the canvas took over still open the job.
export default async function BatchJobPage({ params }: BatchJobPageProps) {
  const { jobId } = await params;
  redirect(`/workflows?job=${encodeURIComponent(jobId)}`);
}
