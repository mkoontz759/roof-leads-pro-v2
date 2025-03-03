import { SecuritySettings } from '@/components/settings/security-settings'

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="space-y-8">
        <SecuritySettings />
        {/* Add other settings sections here */}
      </div>
    </div>
  )
} 