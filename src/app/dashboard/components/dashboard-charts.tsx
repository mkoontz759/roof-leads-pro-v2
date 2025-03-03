'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface DashboardChartsProps {
  dailyTrends: Array<{
    date: string
    newPendings: number
    totalValue: number
  }>
  priceDistribution: Array<{
    range: string
    count: number
  }>
}

export function DashboardCharts({ dailyTrends, priceDistribution }: DashboardChartsProps) {
  console.log('Chart Data:', { dailyTrends, priceDistribution })
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New Pending Transactions (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => value}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} transactions`, 'New Pending']}
                />
                <Bar 
                  dataKey="newPendings" 
                  fill="#3b82f6" 
                  name="New Pending"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Listings by Price Range</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priceDistribution}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  innerRadius={60}
                >
                  {priceDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} listings`]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                />
                <Legend 
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '12px',
                    width: '100%'
                  }}
                  iconSize={8}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 