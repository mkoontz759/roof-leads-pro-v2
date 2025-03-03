'use client';

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface ZipCodeMetrics {
  zipCode: string
  monthlyTransactions: number
  averagePrice: number
  isActive: boolean
}

export function ZipCodeCalculator() {
  const [zipCode, setZipCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<ZipCodeMetrics | null>(null)
  const { toast } = useToast()

  const calculateMonthlyPrice = (metrics: ZipCodeMetrics) => {
    // Example pricing formula:
    // Base price + (transactions * transaction_factor) + (averagePrice * price_factor)
    const baseFee = 20
    const transactionFactor = 2
    const priceFactor = 0.0001

    return (
      baseFee +
      (metrics.monthlyTransactions * transactionFactor) +
      (metrics.averagePrice * priceFactor)
    ).toFixed(2)
  }

  const handleCheck = async () => {
    if (!/^\d{5}$/.test(zipCode)) {
      toast({
        title: "Invalid ZIP Code",
        description: "Please enter a valid 5-digit ZIP code",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/zip-codes/${zipCode}/metrics`)
      const data = await response.json()

      if (!data.isActive) {
        toast({
          title: "ZIP Code Unavailable",
          description: "This ZIP code has no recent transaction activity",
          variant: "destructive"
        })
        setMetrics(null)
        return
      }

      setMetrics(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch ZIP code data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ZIP Code Price Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={5}
              className="flex-1"
            />
            <Button onClick={handleCheck} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Check'}
            </Button>
          </div>

          {metrics && (
            <div className="space-y-2 pt-4">
              <div className="flex justify-between">
                <span>Monthly Transactions:</span>
                <span className="font-medium">{metrics.monthlyTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Price:</span>
                <span className="font-medium">
                  ${metrics.averagePrice.toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-2 mt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Monthly Price:</span>
                  <span>${calculateMonthlyPrice(metrics)}</span>
                </div>
              </div>
              <Button className="w-full mt-4">
                Subscribe to {metrics.zipCode}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 