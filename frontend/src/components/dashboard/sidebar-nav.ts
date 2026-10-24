import {
  BarChart3Icon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PackageIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string | null;
  label: string;
  icon: LucideIcon;
  pronto?: boolean;
  adminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      {
        href: "/dashboard",
        label: "Visión general",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    label: "Herramientas",
    items: [
      {
        href: "/dashboard/productos",
        label: "Productos / Dropi",
        icon: PackageIcon,
      },
      {
        href: "/dashboard/pedidos",
        label: "Pedidos",
        icon: ShoppingCartIcon,
      },
      { href: null, label: "Publicidad", icon: MegaphoneIcon, pronto: true },
      {
        href: "/dashboard/conversaciones",
        label: "Conversaciones",
        icon: MessagesSquareIcon,
      },
      { href: null, label: "Logística", icon: TruckIcon, pronto: true },
      { href: null, label: "Analítica", icon: BarChart3Icon, pronto: true },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        href: "/dashboard/configuraciones/perfil",
        label: "Mi perfil",
        icon: UserRoundIcon,
      },
      {
        href: "/dashboard/configuraciones/usuarios",
        label: "Usuarios y roles",
        icon: UsersIcon,
        adminOnly: true,
      },
      {
        href: "/dashboard/configuraciones/whatsapp",
        label: "WhatsApp",
        icon: QrCodeIcon,
        adminOnly: true,
      },
      {
        href: "/dashboard/configuraciones/integraciones",
        label: "Conexiones (API keys)",
        icon: KeyRoundIcon,
        adminOnly: true,
      },
    ],
  },
];

export function esActivo(pathname: string, href: string | null): boolean {
  if (!href) return false;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}