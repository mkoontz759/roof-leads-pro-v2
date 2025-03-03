'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Search, Plus } from 'lucide-react'

interface ZipCodeAssignment {
  zipCode: string
  purchaseDate: Date
  active: boolean
  source: 'PURCHASE' | 'ADMIN_ASSIGN' | 'GIFT'
}

interface User {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  assignedZipCodes: ZipCodeAssignment[]
}

interface ZipCodeOption {
  code: string
  city: string
  state: string
}

interface ZipCodeManagementProps {
  users: User[]
}

export function ZipCodeManagement({ users: initialUsers }: ZipCodeManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [availableZipCodes, setAvailableZipCodes] = useState<ZipCodeOption[]>([])
  const [zipCodeSearch, setZipCodeSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    userId: '',
    zipCode: '',
    source: 'ADMIN_ASSIGN' as 'PURCHASE' | 'ADMIN_ASSIGN' | 'GIFT'
  })

  useEffect(() => {
    if (isAssignDialogOpen) {
      fetchAvailableZipCodes()
    }
  }, [isAssignDialogOpen])

  const fetchAvailableZipCodes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/zip-codes/available')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch available zip codes')
      }
      const data = await response.json()
      console.log('Fetched zip codes:', data.length)
      if (data.length === 0) {
        console.log('No zip codes found in the response')
      } else {
        console.log('Sample zip code:', data[0])
      }
      setAvailableZipCodes(data)
    } catch (error) {
      console.error('Error fetching zip codes:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch available zip codes',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredZipCodes = availableZipCodes.filter(zipCode => {
    const searchLower = zipCodeSearch.toLowerCase()
    return (
      zipCode.code.includes(searchLower) ||
      zipCode.city.toLowerCase().includes(searchLower) ||
      zipCode.state.toLowerCase().includes(searchLower)
    )
  }).sort((a, b) => a.code.localeCompare(b.code))

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.assignedZipCodes.some(z => z.zipCode.includes(searchTerm))
  )

  const handleAssignZipCode = async () => {
    try {
      const response = await fetch('/api/admin/zip-codes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign zip code')
      }

      const updatedUser = await response.json()
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ))
      setIsAssignDialogOpen(false)
      setNewAssignment({ userId: '', zipCode: '', source: 'ADMIN_ASSIGN' })
      toast({ title: 'Success', description: 'Zip code assigned successfully' })
      window.location.reload() // Refresh to get updated data
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign zip code',
        variant: 'destructive',
      })
    }
  }

  const handleDeactivateZipCode = async (userId: string, zipCode: string) => {
    if (!confirm('Are you sure you want to deactivate this zip code?')) return

    try {
      const response = await fetch('/api/admin/zip-codes/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, zipCode }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deactivate zip code')
      }

      const updatedUser = await response.json()
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ))
      toast({ title: 'Success', description: 'Zip code deactivated successfully' })
      window.location.reload() // Refresh to get updated data
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate zip code',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users or zip codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Assign Zip Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Zip Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User</Label>
                <Select
                  value={newAssignment.userId}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Select
                  value={newAssignment.zipCode}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, zipCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading..." : "Search and select a zip code"} />
                  </SelectTrigger>
                  <SelectContent>
                    <Input
                      className="mb-2 mx-2 w-[calc(100%-16px)]"
                      placeholder="Type to search..."
                      value={zipCodeSearch}
                      onChange={(e) => setZipCodeSearch(e.target.value)}
                    />
                    <div className="max-h-[200px] overflow-y-auto">
                      {isLoading ? (
                        <div className="p-2 text-center text-muted-foreground">
                          Loading zip codes...
                        </div>
                      ) : availableZipCodes.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          No available zip codes
                        </div>
                      ) : filteredZipCodes.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          No matching zip codes
                        </div>
                      ) : (
                        filteredZipCodes.map((zipCode) => (
                          <SelectItem key={zipCode.code} value={zipCode.code}>
                            {zipCode.code} - {zipCode.city}, {zipCode.state}
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={newAssignment.source}
                  onValueChange={(value: 'PURCHASE' | 'ADMIN_ASSIGN' | 'GIFT') => 
                    setNewAssignment({ ...newAssignment, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="ADMIN_ASSIGN">Admin Assign</SelectItem>
                    <SelectItem value="GIFT">Gift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignZipCode}
                disabled={!newAssignment.userId || !newAssignment.zipCode || !newAssignment.source}
              >
                Assign Zip Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Zip Codes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || '-'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.assignedZipCodes
                      .filter(assignment => assignment.active)
                      .map((assignment) => (
                        <div
                          key={assignment.zipCode}
                          className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-2"
                        >
                          {assignment.zipCode}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeactivateZipCode(user.id, assignment.zipCode)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewAssignment({ userId: user.id, zipCode: '', source: 'ADMIN_ASSIGN' })
                      setIsAssignDialogOpen(true)
                    }}
                  >
                    Add Zip Code
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 