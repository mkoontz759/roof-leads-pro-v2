import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, numeric } from 'drizzle-orm/pg-core'

export async function up(db: any) {
  await db.schema.createTable('mls_listings', (table: any) => {
    table.text('listing_key').primaryKey()
    table.numeric('list_price')
    table.text('list_agent_key')
    table.text('street_number')
    table.text('street_name')
    table.text('city')
    table.text('state')
    table.text('postal_code')
    table.timestamp('modification_timestamp')
    table.text('mls_status')
    table.timestamp('contract_status_change_date')
    table.timestamp('listing_contract_date')
    table.timestamp('created_at').defaultNow()
    table.timestamp('updated_at').defaultNow()
  })

  await db.schema.createTable('mls_agents', (table: any) => {
    table.text('member_key').primaryKey()
    table.text('first_name')
    table.text('last_name')
    table.text('full_name')
    table.text('email')
    table.text('office_name')
    table.text('phone')
    table.timestamp('modification_timestamp')
    table.timestamp('created_at').defaultNow()
    table.timestamp('updated_at').defaultNow()
  })
}

export async function down(db: any) {
  await db.schema.dropTable('mls_listings')
  await db.schema.dropTable('mls_agents')
} 