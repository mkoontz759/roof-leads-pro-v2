'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface PricingTier {
  name: string
  price: number
  description: string
  features: string[]
  maxZipCodes: number
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for small agencies',
    features: [
      'Up to 3 ZIP codes',
      'Basic analytics',
      'Email notifications',
      '24/7 support',
    ],
    maxZipCodes: 3
  },
  {
    name: 'Professional',
    price: 99,
    description: 'For growing businesses',
    features: [
      'Up to 10 ZIP codes',
      'Advanced analytics',
      'Priority support',
      'Custom reports',
    ],
    maxZipCodes: 10
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For large organizations',
    features: [
      'Unlimited ZIP codes',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
    ],
    maxZipCodes: Infinity
  }
]

export default function PricingPage() {
  const [selectedZipCodes, setSelectedZipCodes] = useState<string[]>([])
  const router = useRouter()

  const handleSubscribe = (tier: PricingTier) => {
    router.push(`/subscribe?plan=${tier.name.toLowerCase()}`)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that best fits your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {PRICING_TIERS.map((tier) => (
          <Card key={tier.name} className="flex flex-col">
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-3xl font-bold mb-6">
                ${tier.price}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSubscribe(tier)}
              >
                Subscribe
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </div>
  )
} 