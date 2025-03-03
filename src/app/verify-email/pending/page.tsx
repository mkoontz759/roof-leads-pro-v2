'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function PendingVerification() {
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get('callbackUrl')

  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Verification email has been resent",
        })
      } else if (response.status === 429) {
        const data = await response.json()
        toast({
          title: "Error",
          description: "Too many attempts. Please try again later.",
          variant: "destructive",
        })
        return
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend verification email",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <div className="px-8 py-6 mt-4 bg-background shadow-lg rounded-lg w-full max-w-md text-center">
        <h3 className="text-2xl font-bold mb-2">Verify Your Email</h3>
        <p className="text-muted-foreground mb-6">
          Please check your email for a verification link. You need to verify your email before accessing this page.
        </p>
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  )
} 