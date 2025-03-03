const GHL_API_BASE = 'https://rest.gohighlevel.com/v1'
const GHL_API_KEY = process.env.GHL_API_KEY

interface GHLEmailPayload {
  to: string[]
  subject: string
  htmlContent: string
  plainContent?: string
}

export async function sendGHLEmail(payload: GHLEmailPayload) {
  try {
    const response = await fetch(`${GHL_API_BASE}/emails/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }

    return await response.json()
  } catch (error) {
    console.error('GHL API Error:', error)
    throw error
  }
}

interface GHLContact {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  tags?: string[]
}

export async function createOrUpdateContact(contact: GHLContact) {
  try {
    // First try to find the contact
    const searchResponse = await fetch(
      `${GHL_API_BASE}/contacts/lookup?email=${encodeURIComponent(contact.email)}`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
        },
      }
    )

    const searchData = await searchResponse.json()
    const existingContact = searchData.contacts?.[0]

    if (existingContact) {
      // Update existing contact
      const response = await fetch(`${GHL_API_BASE}/contacts/${existingContact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      })

      return await response.json()
    } else {
      // Create new contact
      const response = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      })

      return await response.json()
    }
  } catch (error) {
    console.error('GHL API Error:', error)
    throw error
  }
} 