import { Badge } from "@/components/ui/badge";
import type { AssistantCitation } from "@/types/assistant";

type AssistantCitationsProps = {
  citations: AssistantCitation[];
};

export const AssistantCitations = ({ citations }: AssistantCitationsProps) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-muted-foreground text-xs">Sources</span>
    {citations.map((citation) => (
      <Badge key={citation.documentId} variant="secondary" asChild={Boolean(citation.sourceUrl)}>
        {citation.sourceUrl ? (
          <a href={citation.sourceUrl} target="_blank" rel="noreferrer">
            {citation.title}
          </a>
        ) : (
          <span>{citation.title}</span>
        )}
      </Badge>
    ))}
  </div>
);
