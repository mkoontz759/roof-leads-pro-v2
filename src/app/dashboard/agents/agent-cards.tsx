'use client'

import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface Agent {
  memberKey: string
  fullName: string
  email: string
  phone: string
  officeName: string
  listings: Array<{
    listingKey: string
    streetNumberNumeric: string
    streetName: string
    city: string
    listPrice: number
  }>
  pendingCount: number
}

interface AgentCardsProps {
  agents: Agent[]
  sort: string
}

export function AgentCards({ agents, sort }: AgentCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <Card key={agent.memberKey} className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{agent.fullName}</h3>
              <p className="text-sm text-muted-foreground">{agent.officeName}</p>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <div>{agent.email}</div>
                <div>{agent.phone}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">
                  Pending Transactions
                  <span className="ml-2 text-primary">{agent.pendingCount}</span>
                </div>
              </div>
            </div>

            {agent.listings[0] && (
              <div className="border-t pt-4 mt-4">
                <div className="text-sm font-medium">Latest Listing</div>
                <div className="text-sm">
                  {agent.listings[0].streetNumberNumeric} {agent.listings[0].streetName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(agent.listings[0].listPrice)}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
} 