'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session && window.location.pathname.startsWith('/dashboard')) {
      router.push('/login')
    }
  }, [session, status, router])

  return <>{children}</>
} 