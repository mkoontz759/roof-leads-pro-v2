'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { TwoFactorSetup } from "@/components/two-factor-setup"

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [zipCodes, setZipCodes] = useState('')
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically update the user's settings in your backend
    toast({
      title: "Settings Updated",
      description: "Your settings have been successfully updated.",
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="zipCodes">Subscribed Zip Codes (comma-separated)</Label>
          <Input
            id="zipCodes"
            value={zipCodes}
            onChange={(e) => setZipCodes(e.target.value)}
            placeholder="90210, 90211, 90212"
          />
        </div>
        <Button type="submit">Save Settings</Button>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
        <TwoFactorSetup />
      </div>
    </div>
  )
}

