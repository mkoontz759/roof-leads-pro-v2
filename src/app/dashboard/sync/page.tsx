import { Metadata } from "next"
import { SyncControls } from "./sync-controls"
import { connectDB } from "@/lib/mongodb"

export const metadata: Metadata = {
  title: "Sync Dashboard | Roof Leads Pro",
  description: "Manage MLS data synchronization",
}

async function getSyncStatus() {
  const db = (await connectDB()).db
  if (!db) throw new Error("Failed to connect to database")
  
  const status = await db.collection('syncstatus').findOne({ _id: 'mls_sync' })
  return status || { lastSyncedAt: new Date(), status: 'never' }
}

export default async function SyncDashboard() {
  const syncStatus = await getSyncStatus()
  
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sync Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Manage MLS data synchronization. The system automatically syncs every hour, but you can manually trigger a sync here.
        </p>
        
        <SyncControls initialStatus={syncStatus} />
      </div>
    </div>
  )
} 