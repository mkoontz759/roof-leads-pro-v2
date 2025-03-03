import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

// Define user schema
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
  role: { 
    type: String, 
    enum: ['USER', 'SUPER_ADMIN', 'SUB_ADMIN'], 
    default: 'USER' 
  },
  assignedZipCodes: [{
    zipCode: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Model
const User = mongoose.models.User || mongoose.model('User', UserSchema)

// Prisma-like helper functions
const findUnique = async (where: any) => {
  await connectDB()
  if (where.id) {
    return User.findById(where.id).lean().exec()
  }
  return User.findOne(where).lean().exec()
}

const findMany = async (query: any) => {
  await connectDB()
  let mongoQuery = User.find()

  if (query.select) {
    mongoQuery = mongoQuery.select(query.select)
  }

  if (query.where) {
    mongoQuery = mongoQuery.where(query.where)
  }

  if (query.orderBy) {
    mongoQuery = mongoQuery.sort(query.orderBy)
  }

  if (query.skip) {
    mongoQuery = mongoQuery.skip(query.skip)
  }

  if (query.take) {
    mongoQuery = mongoQuery.limit(query.take)
  }

  return mongoQuery.lean().exec()
}

const findFirst = async (where: any) => {
  await connectDB()
  return User.findOne(where).lean().exec()
}

const create = async (data: any) => {
  await connectDB()
  const newUser = new User(data)
  return newUser.save()
}

const update = async (where: any, data: any) => {
  await connectDB()
  if (where.id) {
    return User.findByIdAndUpdate(where.id, data, { new: true }).lean().exec()
  }
  return User.findOneAndUpdate(where, data, { new: true }).lean().exec()
}

const deleteUser = async (where: any) => {
  await connectDB()
  if (where.id) {
    return User.findByIdAndDelete(where.id).lean().exec()
  }
  return User.findOneAndDelete(where).lean().exec()
}

// New helper functions for zip code management
const addZipCode = async (userId: string, zipCode: string) => {
  await connectDB()
  return User.findByIdAndUpdate(
    userId,
    { 
      $push: { 
        assignedZipCodes: { 
          zipCode,
          purchaseDate: new Date(),
          active: true
        } 
      } 
    },
    { new: true }
  ).lean().exec()
}

const removeZipCode = async (userId: string, zipCode: string) => {
  await connectDB()
  return User.findByIdAndUpdate(
    userId,
    { 
      $pull: { 
        assignedZipCodes: { 
          zipCode 
        } 
      } 
    },
    { new: true }
  ).lean().exec()
}

const deactivateZipCode = async (userId: string, zipCode: string) => {
  await connectDB()
  return User.findOneAndUpdate(
    { 
      _id: userId,
      'assignedZipCodes.zipCode': zipCode
    },
    { 
      $set: { 
        'assignedZipCodes.$.active': false 
      } 
    },
    { new: true }
  ).lean().exec()
}

const getUsersByZipCode = async (zipCode: string) => {
  await connectDB()
  return User.find({
    'assignedZipCodes': {
      $elemMatch: {
        zipCode,
        active: true
      }
    }
  }).lean().exec()
}

export { 
  User,
  findUnique,
  findMany,
  findFirst,
  create,
  update,
  deleteUser as delete,
  addZipCode,
  removeZipCode,
  deactivateZipCode,
  getUsersByZipCode
} 