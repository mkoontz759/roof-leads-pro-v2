import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MainNav } from '@/components/main-nav'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 font-bold">RealEstate Analytics</Link>
        <MainNav />
        <nav className="flex items-center ml-auto space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

