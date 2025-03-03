'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navigation = {
  main: [
    { name: 'Why RealEstate SaaS', href: '/why' },
    {
      name: 'Features',
      items: [
        { name: 'Agent Tracking', href: '/features/agent-tracking' },
        { name: 'Transaction Management', href: '/features/transactions' },
        { name: 'Market Analytics', href: '/features/analytics' },
        { name: 'ZIP Code Insights', href: '/features/zip-insights' },
      ],
    },
    {
      name: 'Solutions',
      items: [
        { name: 'For Brokers', href: '/solutions/brokers' },
        { name: 'For Teams', href: '/solutions/teams' },
        { name: 'For Agents', href: '/solutions/agents' },
      ],
    },
    { name: 'Pricing', href: '/pricing' },
    {
      name: 'Resources',
      items: [
        { name: 'Blog', href: '/blog' },
        { name: 'Help Center', href: '/help' },
        { name: 'API Documentation', href: '/docs' },
      ],
    },
  ],
}

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      {navigation.main.map((item) => {
        if (item.items) {
          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 text-base flex items-center gap-1 px-2"
                >
                  {item.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {item.items.map((subItem) => (
                  <DropdownMenuItem key={subItem.name} asChild>
                    <Link
                      href={subItem.href}
                      className="w-full"
                    >
                      {subItem.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`text-base transition-colors hover:text-primary ${
              pathname === item.href
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

