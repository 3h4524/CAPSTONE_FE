export type NavItemKind = "route" | "section";

export interface NavItem {
  label: string;
  href: string;
  kind: NavItemKind;
}
