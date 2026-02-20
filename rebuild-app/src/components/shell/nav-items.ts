import {
  CalendarDays,
  ChartNoAxesCombined,
  Eye,
  FileImage,
  LayoutDashboard,
  Settings,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

export const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/build', label: 'Build Post', icon: WandSparkles },
  { href: '/review', label: 'Review Queue', icon: Eye },
  { href: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { href: '/assets', label: 'Assets', icon: FileImage },
  { href: '/companies', label: 'Companies', icon: Sparkles },
  { href: '/studio', label: 'AI Studio', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

