import {
  FileText,
  LayoutDashboard,
  Settings,
  SquareCheckBig,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

// Single source of truth for the sidebar nav AND the top-bar page heading.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Templates", href: "/templates", icon: FileText, soon: true },
  { label: "Automations", href: "/automations", icon: Workflow },
  { label: "Tasks", href: "/tasks", icon: SquareCheckBig, soon: true },
  { label: "Integrations", href: "/integrations", icon: Zap, soon: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Heading shown in the top bar for the current route.
export function headingFor(pathname: string): string {
  const match = NAV_ITEMS.find((item) => isActive(pathname, item.href));
  return match?.label ?? "Onboardly";
}
