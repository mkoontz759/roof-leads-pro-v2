'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatInTimeZone } from 'date-fns-tz'
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from 'react'

interface Transaction {
  _id: string
  listingKey: string
  standardFields: {
    streetNumberNumeric?: string
    streetName?: string
    city?: string
    stateOrProvince?: string
    postalCode?: string
    listPrice?: number
    standardStatus?: string
    listOfficeName?: string
    bedsTotal?: number
    bathsTotal?: number
    buildingAreaTotal?: number
    yearBuilt?: number
    propertyType?: string
    propertySubType?: string
    publicRemarks?: string
    address?: string
  }
  modificationTimestamp: string
  agent?: {
    memberKey: string
    fullName: string
    phone: string
    email: string
  }
}

interface TransactionsTableProps {
  transactions: Transaction[]
  sortField: string
  sortOrder: 'asc' | 'desc'
}

// Add a new helper function to check if using default sort
const isDefaultSort = (field: string, order: string) => {
  return field === 'modificationTimestamp' && order === 'desc'
}

// Add a helper function to format phone numbers
const formatPhoneNumber = (phone?: string) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length !== 10) return phone
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
}

// Add a helper function to format currency
const formatPrice = (price?: number) => {
  if (!price) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

export function TransactionsTable({ transactions, sortField, sortOrder }: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const createQueryString = (field: string, forcedOrder?: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams)
    const newOrder = forcedOrder || (field === sortField && sortOrder === 'asc' ? 'desc' : 'asc')
    
    if (field === 'modificationTimestamp' && newOrder === 'desc') {
      // If returning to default sort, remove the params
      params.delete('sortField')
      params.delete('sortOrder')
    } else {
      params.set('sortField', field)
      params.set('sortOrder', newOrder)
    }
    
    return params.toString()
  }

  const getSortIcon = (field: string) => {
    if (field !== sortField) {
      // Show special icon for date column when no sort is active
      if (field === 'modificationTimestamp' && isDefaultSort(sortField, sortOrder)) {
        return <ArrowDown className="ml-2 h-4 w-4 text-muted-foreground" />
      }
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  const formatDate = (date: string) => {
    return formatInTimeZone(
      new Date(date),
      'America/Chicago',
      'MMM d, yyyy h:mm a'
    )
  }

  const getAgentInfo = (transaction: Transaction) => {
    if (!transaction.agent) {
      return {
        fullName: '',
        phoneNumber: '',
        email: ''
      }
    }
    
    return {
      fullName: transaction.agent.fullName,
      phoneNumber: formatPhoneNumber(transaction.agent.phone),
      email: transaction.agent.email
    }
  }

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [searchParams])

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-end p-4 border-b">
        {!isDefaultSort(sortField, sortOrder) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('?' + createQueryString('modificationTimestamp', 'desc'))}
            className="text-sm"
          >
            Reset to Default Sort
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => router.push('?' + createQueryString('modificationTimestamp'))}
                className="flex items-center"
              >
                Date
                {getSortIcon('modificationTimestamp')}
                {isDefaultSort(sortField, sortOrder) && (
                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                )}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => router.push('?' + createQueryString('streetName'))}
              >
                Property
                {getSortIcon('streetName')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => router.push('?' + createQueryString('postalCode'))}
              >
                Location
                {getSortIcon('postalCode')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => router.push('?' + createQueryString('listPrice'))}
              >
                Price
                {getSortIcon('listPrice')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => router.push('?' + createQueryString('listAgent.fullName'))}
              >
                Agent Name
                {getSortIcon('listAgent.fullName')}
              </Button>
            </TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[120px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[200px]" /></TableCell>
              </TableRow>
            ))
          ) : (
            <>
              {transactions.map((transaction) => {
                const agent = getAgentInfo(transaction)
                return (
                  <TableRow key={transaction._id}>
                    <TableCell>{formatDate(transaction.modificationTimestamp)}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.standardFields.streetNumberNumeric} {transaction.standardFields.streetName}
                    </TableCell>
                    <TableCell>
                      {transaction.standardFields.city}, {transaction.standardFields.stateOrProvince} {transaction.standardFields.postalCode}
                    </TableCell>
                    <TableCell>{formatPrice(transaction.standardFields.listPrice)}</TableCell>
                    <TableCell>{agent.fullName}</TableCell>
                    <TableCell>{agent.phoneNumber}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                  </TableRow>
                )
              })}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No transactions found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
} 