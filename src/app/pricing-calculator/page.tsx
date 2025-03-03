'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function PricingCalculator() {
  const [zipCodes, setZipCodes] = useState('')
  const [agentCount, setAgentCount] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const calculatePrice = () => {
    const basePrice = 99
    const zipCodePrice = zipCodes.split(',').length * 10
    const agentPrice = parseInt(agentCount) * 5
    return basePrice + zipCodePrice + agentPrice
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = calculatePrice()
    setMonthlyPrice(price)

    // Here you would typically save this information to the user's account
    // and redirect them to a Stripe checkout page
    toast({
      title: "Price Calculated",
      description: `Your monthly price is $${price}. Redirecting to payment...`,
    })

    // Simulate redirect to Stripe checkout
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg">
        <h3 className="text-2xl font-bold text-center">Calculate Your Price</h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <Label htmlFor="zipCodes">Zip Codes (comma-separated)</Label>
              <Input
                type="text"
                placeholder="90210, 90211, 90212"
                id="zipCodes"
                value={zipCodes}
                onChange={(e) => setZipCodes(e.target.value)}
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="agentCount">Number of Agents</Label>
              <Input
                type="number"
                placeholder="5"
                id="agentCount"
                value={agentCount}
                onChange={(e) => setAgentCount(e.target.value)}
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>
            <Button type="submit" className="w-full px-6 py-2 mt-4">
              Calculate Price
            </Button>
          </div>
        </form>
        {monthlyPrice > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xl font-bold">Your Monthly Price: ${monthlyPrice}</p>
          </div>
        )}
      </div>
    </div>
  )
}

