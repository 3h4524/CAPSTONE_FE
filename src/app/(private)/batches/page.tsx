import type { Metadata } from "next";

import { BatchWorkspace } from "@/components/batches/batch-workspace";

export const metadata: Metadata = { title: "Batches", description: "Manage product batches and their queues." };

const BatchesPage = () => <BatchWorkspace />;

export default BatchesPage;
