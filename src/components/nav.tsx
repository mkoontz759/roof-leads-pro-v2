'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Home,
  Map,
  Settings,
  User,
  LogOut,
  MapPin
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export function Nav({ hideSignOut = false }: { hideSignOut?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const routes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      href: '/dashboard/agents',
      label: 'Agent Cards',
      icon: Users
    },
    {
      href: '/dashboard/transactions',
      label: 'Property List',
      icon: Home
    },
    {
      href: '/dashboard/map',
      label: 'Map View',
      icon: Map
    },
    {
      href: '/dashboard/admin/zip-codes',
      label: 'Zip Codes',
      icon: MapPin,
      adminOnly: true
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings
    },
    {
      href: '/dashboard/account',
      label: 'Account',
      icon: User
    }
  ]

  return (
    <nav className="space-y-2">
      {routes.map((route) => {
        // Skip admin-only routes for non-admin users
        if (route.adminOnly && session?.user?.role !== 'SUPER_ADMIN') {
          return null
        }

        const Icon = route.icon
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent',
              pathname === route.href ? 'bg-accent' : 'transparent'
            )}
          >
            <Icon className="w-4 h-4" />
            {route.label}
          </Link>
        )
      })}
      {!hideSignOut && (
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent text-red-600 dark:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      )}
    </nav>
  )
} 