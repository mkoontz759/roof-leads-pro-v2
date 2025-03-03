import { 
  Home,
  Users,
  Settings,
  RefreshCw
} from "lucide-react"

export const navItems = [
  {
    title: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Agents",
    href: "/dashboard/agents",
    icon: Users,
  },
  {
    title: "Sync",
    href: "/dashboard/sync",
    icon: RefreshCw,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    href: '/dashboard/admin/users',
    label: 'Users',
    icon: Users,
    adminOnly: true
  },
] 