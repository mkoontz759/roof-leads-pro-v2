'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface TwoFactorSetupProps {
  onSuccess?: () => void
}

export function TwoFactorSetup({ onSuccess }: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const setupTwoFactor = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA')
      }
      
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setIsEnabled(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to setup 2FA',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: verificationCode,
          secret: secret
        })
      })
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      toast({
        title: 'Success',
        description: '2FA has been enabled'
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setVerificationCode('')
    }
  }

  if (!isEnabled) {
    return (
      <Button onClick={setupTwoFactor} disabled={isLoading}>
        {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <QRCodeSVG value={qrCode} size={200} />
      </div>
      <p className="text-sm text-center text-muted-foreground">
        Scan this QR code with your authenticator app
      </p>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter verification code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          maxLength={6}
          disabled={isLoading}
        />
        <Button onClick={verifyCode} disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </div>
    </div>
  )
} 