import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role?: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: 'USER' | 'SUPER_ADMIN' | 'SUB_ADMIN'
  }
} 