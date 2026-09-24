import {
  BarChart3Icon,
  BotIcon,
  MegaphoneIcon,
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
  1: BotIcon,
  2: PackageIcon,
  3: TruckIcon,
  4: BarChart3Icon,
};

export const DASHBOARD_MODULES: DashboardModule[] = MODULES.map((m, i) => ({
  ...m,
  href: i === 2 ? "/dashboard/productos" : null,
  pronto: i !== 2,
  icon: ICONOS[i],
}));