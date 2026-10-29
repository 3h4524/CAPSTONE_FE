import { OptionThumbnail } from "@/components/workflows/config-panel/fields/option-thumbnail";

type SourcePreviewProps = {
  imageUrl: string | null;
  title: string;
  /** Short facts shown after the title, such as a niche or a style. */
  tags: string[];
  description: string | null;
};

// What the chosen template or style looks like, under its dropdown.
export const SourcePreview = ({ imageUrl, title, tags, description }: SourcePreviewProps) => (
  <div className="flex gap-3 rounded-md border p-2">
    <OptionThumbnail imageUrl={imageUrl} className="size-14" />
    <div className="min-w-0 flex-1 space-y-0.5 py-0.5">
      <p className="truncate text-sm font-medium text-slate-900">{title}</p>
      {tags.length > 0 && <p className="text-muted-foreground truncate text-xs">{tags.join(" · ")}</p>}
      {description && <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">{description}</p>}
    </div>
  </div>
);
