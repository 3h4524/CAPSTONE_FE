import type { ProductType } from "@/types/batches";

export const productTypeLabels: Record<ProductType, string> = { tshirt: "T-shirt", hoodie: "Hoodie", mug: "Mug", poster: "Poster", tote_bag: "Tote bag", phone_case: "Phone case" };
// Every product falls under exactly one of these, so the counters add up to the batch's product count.
export const statuses = ["pending", "queued", "processing", "review", "completed", "failed"] as const;
// The Dashboard's muted earth tones: neutral while waiting, soft hues while moving, sage when done.
export const statusDot: Record<(typeof statuses)[number], string> = { pending: "bg-[#c9bdb0]", queued: "bg-[#9f93c4]", processing: "bg-[#d8899b]", review: "bg-[#e2b05a]", completed: "bg-[#7d9f68]", failed: "bg-[#e66b7b]" };
export const statusLabel = (status: string) => status === "pending" ? "Pending" : status === "queued" ? "Queued" : status === "failed" ? "Failed" : ["approved", "exported", "published", "completed"].includes(status) ? "Completed" : status === "image_review_required" || status === "review" ? "Review" : "Processing";
