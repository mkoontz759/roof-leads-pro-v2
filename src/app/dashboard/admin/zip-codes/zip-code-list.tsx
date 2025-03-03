'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface ZipCodeListProps {
  users: User[]
}

export function ZipCodeList({ users }: ZipCodeListProps) {
  const activeAssignments = users.flatMap(user => 
    user.assignedZipCodes
      .filter(assignment => assignment.active)
      .map(assignment => ({
        ...assignment,
        userName: user.name || user.email,
        userEmail: user.email
      }))
  )

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zip Code</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Purchase Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeAssignments.map((assignment) => (
            <TableRow key={`${assignment.zipCode}-${assignment.userEmail}`}>
              <TableCell>{assignment.zipCode}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{assignment.userName}</div>
                  <div className="text-sm text-muted-foreground">{assignment.userEmail}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${assignment.source === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                    assignment.source === 'ADMIN_ASSIGN' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'}`}
                >
                  {assignment.source}
                </span>
              </TableCell>
              <TableCell>
                {new Date(assignment.purchaseDate).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 