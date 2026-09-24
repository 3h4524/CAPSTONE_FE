import { z } from "zod";

import { WORKFLOW_MOCK_STORAGE_KEY } from "@/constants/workflow";
import { Log } from "@/helpers/log";
import { sortWorkflowSummaries, toWorkflowSummary } from "@/helpers/workflow-graph";
import { useAuthStore } from "@/stores/auth";
import type { SaveWorkflowInput, WorkflowDetail, WorkflowSummary } from "@/types/workflow";
import { uuid } from "@/utils/uuid";

const LOG_PREFIX = "workflow-mock-server";

const nodeTypeSchema = z.enum([
  "product-input",
  "prompt-synthesis",
  "design-image",
  "approval-gate",
  "apply-mockup",
  "generate-video",
  "generate-listing",
  "export-zip",
  "publish-etsy",
  "publish-printify",
]);

const definitionSchema = z.object({
  version: z.literal(1),
  nodes: z.array(
    z.object({
      id: z.string(),
      type: nodeTypeSchema,
      label: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      config: z.record(z.string(), z.unknown()),
    })
  ),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string() })),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});

const recordSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  nodeCount: z.number(),
  definition: definitionSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const recordsSchema = z.array(recordSchema);

type WorkflowRecord = z.infer<typeof recordsSchema>[number];

const wait = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 300 + Math.round(Math.random() * 300));
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("The request was cancelled.", "AbortError"));
      },
      { once: true }
    );
  });

const readRecords = (): WorkflowRecord[] => {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_MOCK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = recordsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    Log.warn({ prefix: LOG_PREFIX, message: "Discarding malformed workflow data.", data: parsed.error.issues });
    return [];
  } catch (error) {
    Log.error({ prefix: LOG_PREFIX, message: "Unable to read workflows.", data: error });
    return [];
  }
};

const writeRecords = (records: WorkflowRecord[]) => {
  try {
    window.localStorage.setItem(WORKFLOW_MOCK_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    Log.error({ prefix: LOG_PREFIX, message: "Unable to save workflows.", data: error });
    throw new Error("Unable to save workflows in this browser. Free up storage and try again.");
  }
};

const requireOwnerId = () => {
  const ownerId = useAuthStore.getState().user?.id;
  if (!ownerId) throw new Error("Please sign in to manage workflows.");
  return ownerId;
};

const toDetail = ({ ownerId: _ownerId, ...record }: WorkflowRecord): WorkflowDetail => record;

const findOwnedRecord = (records: WorkflowRecord[], ownerId: string, id: string) => {
  const record = records.find((item) => item.id === id && item.ownerId === ownerId);
  if (!record) throw new Error("The workflow was not found. It may have been deleted.");
  return record;
};

const assertNameAvailable = (records: WorkflowRecord[], ownerId: string, name: string, exceptId?: string) => {
  const normalized = name.trim().toLowerCase();
  const taken = records.some(
    (item) => item.ownerId === ownerId && item.id !== exceptId && item.name.toLowerCase() === normalized
  );
  if (taken) throw new Error("A workflow with this name already exists.");
};

export const workflowMockServer = {
  list: async (signal?: AbortSignal): Promise<WorkflowSummary[]> => {
    await wait(signal);
    const ownerId = requireOwnerId();
    return sortWorkflowSummaries(
      readRecords()
        .filter((item) => item.ownerId === ownerId)
        .map((item) => toWorkflowSummary(toDetail(item)))
    );
  },

  get: async (id: string, signal?: AbortSignal): Promise<WorkflowDetail> => {
    await wait(signal);
    const ownerId = requireOwnerId();
    return toDetail(findOwnedRecord(readRecords(), ownerId, id));
  },

  create: async (input: SaveWorkflowInput): Promise<WorkflowDetail> => {
    await wait();
    const ownerId = requireOwnerId();
    const records = readRecords();
    assertNameAvailable(records, ownerId, input.name);
    const now = new Date().toISOString();
    const record: WorkflowRecord = {
      id: uuid(),
      ownerId,
      name: input.name.trim(),
      description: input.description.trim(),
      nodeCount: input.definition.nodes.length,
      definition: input.definition,
      createdAt: now,
      updatedAt: now,
    };
    writeRecords([...records, record]);
    return toDetail(record);
  },

  update: async (id: string, input: SaveWorkflowInput): Promise<WorkflowDetail> => {
    await wait();
    const ownerId = requireOwnerId();
    const records = readRecords();
    const existing = findOwnedRecord(records, ownerId, id);
    assertNameAvailable(records, ownerId, input.name, id);
    const updated: WorkflowRecord = {
      ...existing,
      name: input.name.trim(),
      description: input.description.trim(),
      nodeCount: input.definition.nodes.length,
      definition: input.definition,
      updatedAt: new Date().toISOString(),
    };
    writeRecords(records.map((item) => (item.id === id ? updated : item)));
    return toDetail(updated);
  },

  remove: async (id: string): Promise<void> => {
    await wait();
    const ownerId = requireOwnerId();
    const records = readRecords();
    findOwnedRecord(records, ownerId, id);
    writeRecords(records.filter((item) => item.id !== id));
  },
};
