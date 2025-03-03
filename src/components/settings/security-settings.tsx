'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TwoFactorSetup } from '@/components/two-factor-setup'
import { useSession } from 'next-auth/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'

export function SecuritySettings() {
  const { data: session, status } = useSession()
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisabling, setIsDisabling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const checkTwoFactorStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/auth/2fa/status')
      if (!response.ok) throw new Error('Failed to fetch 2FA status')
      const data = await response.json()
      setIs2FAEnabled(data.enabled)
    } catch (error) {
      setError('Failed to load 2FA status')
      console.error('Failed to fetch 2FA status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      checkTwoFactorStatus()
    }
  }, [session])

  const handleDisable2FA = async () => {
    try {
      setIsDisabling(true)
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to disable 2FA')

      setIs2FAEnabled(false)
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA',
        variant: 'destructive'
      })
    } finally {
      setIsDisabling(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security settings and two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {is2FAEnabled
                ? 'Two-factor authentication is enabled'
                : 'Add an extra layer of security to your account by enabling two-factor authentication'}
            </p>
            <AnimatePresence mode="wait">
              {is2FAEnabled ? (
                <motion.div
                  key="disable"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                    disabled={isDisabling}
                  >
                    {isDisabling ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="enable"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TwoFactorSetup
                    onSuccess={() => setIs2FAEnabled(true)}
                    onError={(message) => setError(message)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px] mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-6 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[250px] mb-4" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
      </CardContent>
    </Card>
  )
} 