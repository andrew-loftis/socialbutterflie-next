import {
  CalendarDays,
  ChartNoAxesCombined,
  Eye,
  FileImage,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Plug2,
  Building2,
  WandSparkles,
  Zap,
  Hash,
  FileText,
} from 'lucide-react';

export const navItems = [
  { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard     },
  { href: '/calendar',        label: 'Calendar',        icon: CalendarDays        },
  { href: '/build',           label: 'Publish',         icon: WandSparkles        },
  { href: '/studio/stories',  label: 'Stories',         icon: Layers              },
  { href: '/review',          label: 'Review Queue',    icon: Eye                 },
  { href: '/inbox',           label: 'Inbox',           icon: MessageSquare       },
  { href: '/analytics',       label: 'Analytics',       icon: ChartNoAxesCombined },
  { href: '/assets',          label: 'Assets',          icon: FileImage           },
  { href: '/studio/hashtags', label: 'Hashtag Studio',  icon: Hash                },
  { href: '/automations',     label: 'Automations',     icon: Zap                 },
  { href: '/companies',       label: 'Companies',       icon: Building2           },
  { href: '/integrations',    label: 'Integrations',    icon: Plug2               },
] as const;

