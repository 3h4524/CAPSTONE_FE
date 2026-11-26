export const RAG_MANUAL_CONTENT_TYPE_OPTIONS = [
  ["listing", "admin.dashboard.ragIngest.contentTypes.listings"],
  ["policy", "admin.dashboard.ragIngest.contentTypes.policies"],
  ["keyword", "admin.dashboard.ragIngest.contentTypes.keywords"],
  ["faq", "admin.dashboard.ragIngest.contentTypes.faq"],
  ["image", "admin.dashboard.ragIngest.contentTypes.image"],
] as const;

export const RAG_CONTENT_TYPE_OPTIONS = [
  ...RAG_MANUAL_CONTENT_TYPE_OPTIONS,
  ["video", "admin.dashboard.ragIngest.contentTypes.video"],
] as const;
