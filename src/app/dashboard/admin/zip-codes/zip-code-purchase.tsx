"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

interface ZipCodePurchaseProps {
  user: {
    id: string
    email: string
    name?: string | null
  }
}

export function ZipCodePurchase({ user }: ZipCodePurchaseProps) {
  const [zipCode, setZipCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (!zipCode.match(/^\d{5}$/)) {
      toast({
        title: 'Invalid zip code',
        description: 'Please enter a valid 5-digit zip code',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/zip-codes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          zipCode,
          source: 'PURCHASE'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to purchase zip code')
      }

      toast({ title: 'Success', description: 'Zip code purchased successfully' })
      setZipCode('')
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to purchase zip code',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-4 items-end">
      <div className="space-y-2 flex-1">
        <Label htmlFor="zipCode">Zip Code</Label>
        <Input
          id="zipCode"
          placeholder="Enter 5-digit zip code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          pattern="\d{5}"
          maxLength={5}
        />
      </div>
      <Button 
        onClick={handlePurchase}
        disabled={isLoading || !zipCode.match(/^\d{5}$/)}
      >
        {isLoading ? 'Purchasing...' : 'Purchase'}
      </Button>
    </div>
  )
} 