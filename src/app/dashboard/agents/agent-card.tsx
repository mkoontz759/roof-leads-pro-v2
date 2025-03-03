import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Mail, Building2, Hash } from "lucide-react"
import { formatDistanceToNow, format, isValid, parseISO } from "date-fns"
import { ListingLifecycle } from "@/lib/models/mls"
import { AgentIdTooltip } from './agent-id-tooltip'

interface AgentCardProps {
  agent: {
    memberKey: string
    fullName: string
    email?: string
    phone?: string
    officeName?: string
    activeListingsCount?: number 
    pendingListingsCount?: number
    listings: Array<{
      listingKey?: string
      address?: string
      streetNumberNumeric?: string
      streetName?: string
      city?: string
      state?: string
      stateOrProvince?: string
      zipCode?: string
      postalCode?: string
      listPrice: number
      status: ListingLifecycle
      statusChangeDate?: Date | string
      modificationTimestamp?: Date | string
    }>
  }
}

function getValidDate(date: Date | string | undefined | null) {
  if (!date) return null
  
  try {
    if (date instanceof Date) return date
    
    const parsedDate = parseISO(date)
    return isValid(parsedDate) ? parsedDate : null
  } catch {
    return null
  }
}

// Add phone formatting function
function formatPhoneNumber(phone: string) {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  // Format as (XXX) XXX-XXXX
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

// Function to format address based on available fields
function formatAddress(listing: AgentCardProps['agent']['listings'][0]) {
  // If we have a pre-formatted address, use it
  if (listing.address) {
    return listing.address;
  }
  
  // Otherwise, build from components
  const streetNumber = listing.streetNumberNumeric || '';
  const streetName = listing.streetName || '';
  const city = listing.city || '';
  const state = listing.state || listing.stateOrProvince || '';
  const zipCode = listing.zipCode || listing.postalCode || '';
  
  // Format the address with parts that are available
  let formattedAddress = '';
  
  if (streetNumber || streetName) {
    formattedAddress += `${streetNumber} ${streetName}`.trim();
  }
  
  if (city) {
    if (formattedAddress) formattedAddress += ', ';
    formattedAddress += city;
  }
  
  if (state) {
    if (formattedAddress) formattedAddress += ', ';
    formattedAddress += state;
  }
  
  if (zipCode) {
    if (formattedAddress) formattedAddress += ' ';
    formattedAddress += zipCode;
  }
  
  return formattedAddress || 'Unknown Address';
}

export function AgentCard({ agent }: AgentCardProps) {
  // Get active and pending listings
  const activeListings = agent.listings.filter(
    listing => listing.status === ListingLifecycle.ACTIVE
  );
  
  const pendingListings = agent.listings.filter(
    listing => listing.status === ListingLifecycle.PENDING
  );
  
  // Sort listings by date
  const sortListings = (listings: typeof agent.listings) => {
    return [...listings].sort((a, b) => {
      const dateA = getValidDate(a.statusChangeDate || a.modificationTimestamp)
      const dateB = getValidDate(b.statusChangeDate || b.modificationTimestamp)
      
      if (!dateA || !dateB) return 0
      return dateB.getTime() - dateA.getTime()
    });
  };
  
  const sortedActiveListings = sortListings(activeListings);
  const sortedPendingListings = sortListings(pendingListings);

  return (
    <Card key={agent.memberKey}>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage 
            src={`https://api.dicebear.com/6.x/initials/svg?seed=${agent.fullName}`} 
            alt={agent.fullName} 
          />
          <AvatarFallback>
            {agent.fullName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{agent.fullName}</CardTitle>
          <div className="mt-1">
            <AgentIdTooltip memberId={agent.memberKey} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {agent.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${agent.phone.replace(/\D/g, '')}`}
                className="hover:underline text-inherit"
              >
                {formatPhoneNumber(agent.phone)}
              </a>
            </div>
          )}
          {agent.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${agent.email}`}
                className="hover:underline text-inherit truncate"
              >
                {agent.email}
              </a>
            </div>
          )}
          {agent.officeName && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{agent.officeName}</span>
            </div>
          )}
        </div>
        
        {/* Always show both sections, but they'll be empty if no listings */}
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">
            Pending Transactions ({pendingListings.length})
          </h3>
          {pendingListings.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
              {sortedPendingListings.map((listing, index) => {
                const statusDate = getValidDate(listing.statusChangeDate || listing.modificationTimestamp)
                const listingId = listing.listingKey || `pending-${index}`;
                
                return (
                  <div key={listingId} className="text-sm p-2 bg-muted rounded-lg">
                    <div className="font-medium">
                      {formatAddress(listing)}
                    </div>
                    <div className="font-semibold text-amber-600 mt-1">
                      ${listing.listPrice.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {statusDate ? (
                        <span className="text-xs italic">
                          Updated {format(statusDate, 'MMM d')} at {format(statusDate, 'h:mma').toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-xs italic">
                          Date not available
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No pending transactions
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">
            Active Listings ({activeListings.length})
          </h3>
          {activeListings.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
              {sortedActiveListings.map((listing, index) => {
                const statusDate = getValidDate(listing.statusChangeDate || listing.modificationTimestamp)
                const listingId = listing.listingKey || `active-${index}`;
                
                return (
                  <div key={listingId} className="text-sm p-2 bg-muted rounded-lg">
                    <div className="font-medium">
                      {formatAddress(listing)}
                    </div>
                    <div className="font-semibold text-green-600 mt-1">
                      ${listing.listPrice.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {statusDate ? (
                        <span className="text-xs italic">
                          Updated {format(statusDate, 'MMM d')} at {format(statusDate, 'h:mma').toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-xs italic">
                          Date not available
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No active listings
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 