import type { Metadata } from "next";

import { EditDesignPromptHost } from "@/components/batch-config/edit-design-prompt/edit-design-prompt-host";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Prompt Editor",
  description: "Temporary host to verify the design prompt editor.",
  pathname: "/prompt-editor",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <EditDesignPromptHost />;
}
