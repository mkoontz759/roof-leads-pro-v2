import { connectDB, mongoose } from '@/lib/mongodb'

// Define User model if it doesn't already exist
const getUserModel = () => {
  if (mongoose.models.User) {
    return mongoose.models.User
  }
  
  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    emailVerified: Date,
    image: String,
    resetToken: String,
    resetTokenExpiry: Date,
    verificationToken: {
      token: String,
      expires: Date
    },
    twoFactorEnabled: Boolean,
    twoFactorSecret: String,
    tempTwoFactorSecret: String,
    backupCodes: [String],
    role: { type: String, enum: ['USER', 'SUPER_ADMIN', 'SUB_ADMIN'], default: 'USER' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  })
  
  return mongoose.model('User', UserSchema)
}

// Define VerificationLog model if it doesn't already exist
const getVerificationLogModel = () => {
  if (mongoose.models.VerificationLog) {
    return mongoose.models.VerificationLog
  }
  
  const VerificationLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String,
    status: String,
    ipAddress: String,
    userAgent: String,
    error: String,
    createdAt: { type: Date, default: Date.now }
  })
  
  return mongoose.model('VerificationLog', VerificationLogSchema)
}

// Define SyncLog model if it doesn't already exist
const getSyncLogModel = () => {
  if (mongoose.models.SyncLog) {
    return mongoose.models.SyncLog
  }
  
  const SyncLogSchema = new mongoose.Schema({
    status: String,
    type: String,
    startTime: Date,
    endTime: Date,
    recordsProcessed: Number,
    error: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  })
  
  return mongoose.model('SyncLog', SyncLogSchema)
}

// Simple version with any types to avoid TypeScript errors
export const prisma: any = {
  user: {
    create: async (data: any) => {
      await connectDB()
      const User = getUserModel()
      const model = new User(data.data)
      return model.save()
    },
    findUnique: async (query: any) => {
      await connectDB()
      const User = getUserModel()
      
      if (query.where.id) {
        return User.findById(query.where.id)
      }
      
      return User.findOne(query.where)
    },
    update: async (query: any) => {
      await connectDB()
      const User = getUserModel()
      
      if (query.where.id) {
        return User.findByIdAndUpdate(
          query.where.id,
          { $set: query.data },
          { new: true }
        )
      }
      
      return User.findOneAndUpdate(
        query.where,
        { $set: query.data },
        { new: true }
      )
    },
    delete: async (query: any) => {
      await connectDB()
      const User = getUserModel()
      
      if (query.where.id) {
        return User.findByIdAndDelete(query.where.id)
      }
      
      return User.findOneAndDelete(query.where)
    }
  },
  
  verificationLog: {
    create: async (data: any) => {
      await connectDB()
      const VerificationLog = getVerificationLogModel()
      const model = new VerificationLog(data.data)
      return model.save()
    },
    findMany: async (query: any = {}) => {
      await connectDB()
      const VerificationLog = getVerificationLogModel()
      
      let findQuery = VerificationLog.find(query.where || {})
      
      if (query.orderBy) {
        findQuery = findQuery.sort(query.orderBy)
      }
      
      if (query.take) {
        findQuery = findQuery.limit(query.take)
      }
      
      if (query.skip) {
        findQuery = findQuery.skip(query.skip)
      }
      
      return findQuery.exec()
    },
    count: async (query: any = {}) => {
      await connectDB()
      const VerificationLog = getVerificationLogModel()
      return VerificationLog.countDocuments(query.where || {})
    }
  },
  
  syncLog: {
    create: async (data: any) => {
      await connectDB()
      const SyncLog = getSyncLogModel()
      const model = new SyncLog(data.data)
      return model.save()
    },
    findMany: async (query: any = {}) => {
      await connectDB()
      const SyncLog = getSyncLogModel()
      
      let findQuery = SyncLog.find(query.where || {})
      
      if (query.orderBy) {
        findQuery = findQuery.sort(query.orderBy)
      }
      
      if (query.take) {
        findQuery = findQuery.limit(query.take)
      }
      
      if (query.skip) {
        findQuery = findQuery.skip(query.skip)
      }
      
      return findQuery.exec()
    },
    update: async (query: any) => {
      await connectDB()
      const SyncLog = getSyncLogModel()
      
      if (query.where.id) {
        return SyncLog.findByIdAndUpdate(
          query.where.id,
          { $set: query.data },
          { new: true }
        )
      }
      
      return SyncLog.findOneAndUpdate(
        query.where,
        { $set: query.data },
        { new: true }
      )
    }
  }
} 