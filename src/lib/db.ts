// Compatability layer to make migration from Prisma to Mongoose easier
import * as UserModel from '@/lib/models/user'
import * as VerificationLogModel from '@/lib/models/verification-log'
import * as SyncLogModel from '@/lib/models/sync-log'

// This provides a Prisma-like interface that redirects to our Mongoose models
export const prisma = {
  user: {
    findUnique: async (query: any) => {
      return UserModel.findUnique(query.where)
    },
    findMany: async (query: any) => {
      return UserModel.findMany(query)
    },
    findFirst: async (query: any) => {
      return UserModel.findFirst(query.where)
    },
    create: async (query: any) => {
      return UserModel.create(query.data)
    },
    update: async (query: any) => {
      return UserModel.update(query.where, query.data)
    },
    delete: async (query: any) => {
      return UserModel.delete(query.where)
    }
  },
  
  verificationLog: {
    create: async (query: any) => {
      return VerificationLogModel.create(query.data)
    },
    findMany: async (query: any = {}) => {
      return VerificationLogModel.findMany(
        query.where,
        {
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take
        }
      )
    },
    count: async (query: any = {}) => {
      return VerificationLogModel.count(query.where)
    }
  },
  
  syncLog: {
    create: async (query: any) => {
      return SyncLogModel.create(query.data)
    },
    findMany: async (query: any = {}) => {
      return SyncLogModel.findMany(
        query.where,
        {
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take
        }
      )
    },
    update: async (query: any) => {
      return SyncLogModel.update(query.where, query.data)
    }
  }
} 