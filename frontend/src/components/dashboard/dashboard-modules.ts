import {
  BarChart3Icon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PackageIcon,
  TruckIcon,
} from "lucide-react";
import { MODULES } from "@/components/auth/about-data";

export interface DashboardModule {
  id: string;
  title: string;
  description: string;
  tag: string;
  href: string | null;
  pronto: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const ICONOS: Record<number, React.ComponentType<{ className?: string }>> = {
  0: MegaphoneIcon,
  1: MessagesSquareIcon,
  2: PackageIcon,
  3: TruckIcon,
  4: BarChart3Icon,
};

const ENLACES: Record<number, string> = {
  1: "/dashboard/conversaciones",
  2: "/dashboard/productos",
};

export const DASHBOARD_MODULES: DashboardModule[] = MODULES.map((m, i) => ({
  ...m,
  href: ENLACES[i] ?? null,
  pronto: i !== 1 && i !== 2,
  icon: ICONOS[i],
}));