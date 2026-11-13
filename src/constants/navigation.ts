import {
  Activity,
  BarChart3,
  Compass,
  CreditCard,
  Database,
  FlaskConical,
  Headphones,
  ImageIcon,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Settings,
  Shirt,
  Store,
  UserRound,
  Users,
  WandSparkles,
  Workflow,
} from "lucide-react";

import type { AdminNavSection, AppNavSection, RouteTitle } from "@/types/navigation";

export const NAV_SECTIONS: AppNavSection[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", titleKey: "navigation.items.dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "WORKSPACE",
    items: [
      { label: "Shop", titleKey: "navigation.items.shop", href: "/shop", icon: Store },
      { label: "Workflows", titleKey: "navigation.items.workflows", href: "/workflows", icon: Workflow },
      { label: "Batches", titleKey: "navigation.items.batches", href: "/batches", icon: Layers3 },
      { label: "My Styles", titleKey: "navigation.items.styles", href: "/styles", icon: Palette },
      { label: "Design templates", titleKey: "navigation.items.templates", href: "/design-templates", icon: WandSparkles },
      { label: "Mock-up templates", titleKey: "navigation.items.mockups", href: "/mockups", icon: Shirt },
      { label: "API keys", titleKey: "navigation.items.apiKeys", href: "/api-keys", icon: KeyRound },
      { label: "Usage", titleKey: "navigation.items.usage", href: "/usage", icon: Activity },
      { label: "Market Radar", titleKey: "navigation.items.marketRadar", href: "/market-opportunities", icon: Compass },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Support", titleKey: "navigation.items.support", href: "/support", icon: LifeBuoy },
      { label: "Settings", titleKey: "navigation.items.settings", href: "/settings", icon: Settings },
      { label: "Billing", titleKey: "navigation.items.billing", href: "/subscription", icon: CreditCard },
    ],
  },
];

/** The phone's bottom tabs. Every other page stays reachable from the More tab. */
export const MOBILE_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shop", href: "/shop", icon: Store },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Batches", href: "/batches", icon: Layers3 },
];

/** The Admin's bottom tabs; More opens the sidebar for the other pages. */
export const ADMIN_MOBILE_TABS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Revenue", href: "/admin/revenue", icon: BarChart3 },
  { label: "Support", href: "/admin/support-tickets", icon: Headphones },
];

/** The template form: its own action sits at the foot of a phone's screen, where the tabs would be. */
export const isDesignTemplateForm = (pathname: string | null) =>
  /^\/design-templates\/(new|[^/]+\/edit)$/.test(pathname ?? "");

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Overview",
    titleKey: "navigation.admin.sections.overview",
    items: [
      { label: "Dashboard", titleKey: "navigation.admin.items.dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "RAG Knowledge Base", titleKey: "navigation.admin.items.ragKnowledgeBase", href: "/admin/rag-ingest", icon: Database },
      { label: "Market Insights", titleKey: "navigation.admin.items.marketInsights", href: "/admin/market-insights", icon: BarChart3 },
      { label: "RAG Evaluation", titleKey: "navigation.admin.items.ragEvaluation", href: "/admin/rag-evaluation", icon: FlaskConical },
      { label: "Users", titleKey: "navigation.admin.items.users", href: "/admin/users", icon: Users },
      { label: "Subscriptions", titleKey: "navigation.admin.items.subscriptions", href: "/admin/subscription-plans", icon: CreditCard },
      { label: "Model Photos", titleKey: "navigation.admin.items.modelPhotos", href: "/admin/model-photos", icon: UserRound },
      { label: "Mock-up Templates", titleKey: "navigation.admin.items.mockupTemplates", href: "/admin/mockup-templates", icon: Shirt },
    ],
  },
  {
    label: "Finance & Analytics",
    titleKey: "navigation.admin.sections.financeAnalytics",
    items: [
      { label: "Revenue & Reports", titleKey: "navigation.admin.items.revenueReports", href: "/admin/revenue", icon: BarChart3 },
      { label: "System Statistics", titleKey: "navigation.admin.items.systemStatistics", href: "/admin/analytics", icon: Activity },
      { label: "Image Quality", titleKey: "navigation.admin.items.imageQuality", href: "/admin/image-quality", icon: ImageIcon },
    ],
  },
  {
    label: "System",
    titleKey: "navigation.admin.sections.system",
    items: [
      { label: "Support Tickets", titleKey: "navigation.admin.items.supportTickets", href: "/admin/support-tickets", icon: Headphones },
      { label: "Test Reports", titleKey: "navigation.admin.items.testReports", href: "/admin/test-reports", icon: FlaskConical },
      { label: "Settings", titleKey: "navigation.admin.items.settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const ADMIN_FILLS_PHONE_SCREEN_ROUTES = ["/admin/support-tickets"];

const EXTRA_ROUTE_TITLES: RouteTitle[] = [
  { path: "/profile", titleKey: "navigation.items.profile", defaultTitle: "Profile" },
  { path: "/prompt-editor", titleKey: "navigation.items.promptEditor", defaultTitle: "Prompt Editor" },
  { path: "/market-insights", titleKey: "navigation.items.marketInsights", defaultTitle: "Market Insights" },
  { path: "/batch-jobs", titleKey: "navigation.items.batches", defaultTitle: "Batches" },
  { path: "/admin/profile", titleKey: "navigation.admin.items.profile", defaultTitle: "Profile" },
];

export const ROUTE_TITLES: RouteTitle[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...ADMIN_NAV_SECTIONS.flatMap((section) => section.items),
].map((item) => ({ path: item.href, titleKey: item.titleKey, defaultTitle: item.label })).concat(EXTRA_ROUTE_TITLES);
