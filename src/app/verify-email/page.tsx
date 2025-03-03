'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function VerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setIsVerifying(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          setIsSuccess(true)
          toast({
            title: "Success",
            description: "Your email has been verified",
          })
        } else {
          const data = await response.json()
          throw new Error(data.error)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to verify email",
          variant: "destructive",
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyEmail()
  }, [token, toast])

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <div className="px-8 py-6 mt-4 bg-background shadow-lg rounded-lg w-full max-w-md text-center">
          <p>Verifying your email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <div className="px-8 py-6 mt-4 bg-background shadow-lg rounded-lg w-full max-w-md text-center">
        <h3 className="text-2xl font-bold mb-2">
          {isSuccess ? 'Email Verified' : 'Verification Failed'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isSuccess
            ? 'Thank you for verifying your email address.'
            : 'The verification link is invalid or has expired.'}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href={isSuccess ? '/dashboard' : '/login'}>
            {isSuccess ? 'Go to Dashboard' : 'Back to Login'}
          </Link>
        </Button>
      </div>
    </div>
  )
} 