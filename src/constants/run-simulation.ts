import type { WorkflowNodeCategory } from "@/types/workflow";

export const SIMULATION_STEP_MS: Record<WorkflowNodeCategory, number> = {
  trigger: 700,
  ai: 2800,
  review: 1400,
  output: 1800,
};

export const SIMULATION_TICK_MS = 80;

export const SIMULATION_CHUNK_SIZE = 9;

export const SIMULATION_RESET_MS = 6000;

export const SIMULATION_PRODUCT_ID = "simulation";

export const SIMULATION_LISTING = {
  title: "Watercolor Cat Mug 11oz, Cute Tabby Coffee Cup, Gift for Cat Lovers",
  description:
    "A sleepy watercolor tabby curled up on a glossy 11oz ceramic mug. Dishwasher and microwave safe, printed to order for every cat lover.",
  tags: [
    "cat mug",
    "cat lover gift",
    "watercolor cat",
    "tabby cat",
    "coffee mug",
    "cute mug",
    "gift for her",
    "ceramic mug",
    "11oz mug",
    "kitten mug",
    "cat mom",
    "birthday gift",
    "tea cup",
  ],
};

export const RUN_SIMULATION_ENABLED = process.env.NEXT_PUBLIC_WORKFLOW_RUN_SIMULATION === "true";

export const WORKFLOW_EFFECT_STORAGE_KEY = "workflowEffect";
