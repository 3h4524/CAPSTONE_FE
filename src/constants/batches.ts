import type { ProductLine, ProductType } from "@/types/batches";

export const productTypeLabels: Record<ProductType, string> = { tshirt: "T-shirt", hoodie: "Hoodie", mug: "Mug", poster: "Poster", tote_bag: "Tote bag", phone_case: "Phone case" };

// A batch makes one product line, because each line prints, shows and sells its products its own way: a transparent
// chest graphic, a mug wrap, a full-bleed poster or a tall phone case, each its own Printify product and Etsy listing.
// T-shirts and hoodies share a line, so one design goes on both. Mirrors the backend's ProductLines.
export const productLines = ["apparel", "bags", "drinkware", "wall_art", "phone_cases"] as const satisfies readonly ProductLine[];
export const productLineTypes: Record<ProductLine, ProductType[]> = {
  apparel: ["tshirt", "hoodie"],
  bags: ["tote_bag"],
  drinkware: ["mug"],
  wall_art: ["poster"],
  phone_cases: ["phone_case"],
};
export const productLineLabels: Record<ProductLine, string> = { apparel: "Apparel", bags: "Tote bags", drinkware: "Mugs", wall_art: "Wall art", phone_cases: "Phone cases" };
export const productLineOf = (type: string | null | undefined): ProductLine | null =>
  productLines.find((line) => (productLineTypes[line] as string[]).includes((type ?? "").toLowerCase())) ?? null;

// The design aspect ratios that suit each line's print area, the first the one a new run should use. A chest print is
// taller than wide, a mug print wraps around the mug, a phone case is tall; a ratio outside the list leaves most of
// the print area empty or crops the artwork.
export const productLineRatios: Record<ProductLine, { ratios: string[]; why: string }> = {
  apparel: { ratios: ["3:4", "1:1"], why: "A chest print is a little taller than wide." },
  bags: { ratios: ["1:1", "3:4"], why: "A tote's print area is about square." },
  drinkware: { ratios: ["16:9", "1:1"], why: "A mug print wraps around the mug; 1:1 fits one side." },
  wall_art: { ratios: ["3:4", "4:3", "1:1"], why: "Posters print at 3:4 portrait, 4:3 landscape or square." },
  phone_cases: { ratios: ["9:16"], why: "A phone case is tall and narrow." },
};
// Every product falls under exactly one of these, so the counters add up to the batch's product count.
export const statuses = ["pending", "queued", "processing", "review", "completed", "failed"] as const;
// The Dashboard's muted earth tones: neutral while waiting, soft hues while moving, sage when done.
export const statusDot: Record<(typeof statuses)[number], string> = { pending: "bg-[#c9bdb0]", queued: "bg-[#9f93c4]", processing: "bg-[#d8899b]", review: "bg-[#e2b05a]", completed: "bg-[#7d9f68]", failed: "bg-[#e66b7b]" };
export const statusLabel = (status: string) => status === "pending" ? "Pending" : status === "queued" ? "Queued" : status === "failed" ? "Failed" : ["approved", "exported", "published", "completed"].includes(status) ? "Completed" : status === "image_review_required" || status === "review" ? "Review" : "Processing";
