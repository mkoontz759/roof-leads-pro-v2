'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export function SettingsForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [zipCodes, setZipCodes] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Here you would typically update the user's settings in your backend
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, zipCodes })
      })

      if (!response.ok) throw new Error('Failed to update settings')

      toast({
        title: "Settings Updated",
        description: "Your settings have been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
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
  )
} 