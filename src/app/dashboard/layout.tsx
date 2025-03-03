'use client'

import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Nav } from '@/components/nav'
import { BarChart2, Users, FileText, Map, Settings, User } from 'lucide-react'
import { AuthCheck } from './auth-check'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart2 },
  { name: 'Agents', href: '/dashboard/agents', icon: Users },
  { name: 'Transactions', href: '/dashboard/transactions', icon: FileText },
  { name: 'Map View', href: '/dashboard/map', icon: Map },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Account', href: '/dashboard/account', icon: User },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AuthCheck>
      <div className="min-h-screen bg-muted/50">
        {/* Mobile sidebar overlay */}
        <div
          className={cn(
            'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden',
            sidebarOpen ? 'block' : 'hidden'
          )}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Mobile sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-lg transition-transform duration-300 ease-in-out lg:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="text-lg font-semibold">RealEstate SaaS</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="px-2 py-4">
            <Nav hideSignOut={false} />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r bg-background">
          <div className="flex h-16 items-center px-4 border-b">
            <span className="text-lg font-semibold">RealEstate SaaS</span>
          </div>
          <div className="flex-1 px-2 py-4">
            <Nav hideSignOut={false} />
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 sm:gap-x-6 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>

          <main className="py-8">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </AuthCheck>
  )
}

