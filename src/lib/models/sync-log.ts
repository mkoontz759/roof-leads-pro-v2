import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

// Define sync log schema
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

// Model
const SyncLog = mongoose.models.SyncLog || 
  mongoose.model('SyncLog', SyncLogSchema)

// Helper functions
const create = async (data: any) => {
  await connectDB()
  const log = new SyncLog(data)
  return log.save()
}

const findMany = async (where: any = {}, options: any = {}) => {
  await connectDB()
  
  let query = SyncLog.find(where)
  
  if (options.orderBy) {
    const [field, direction] = Object.entries(options.orderBy)[0]
    const sort: any = {}
    sort[field] = direction === 'asc' ? 1 : -1
    query = query.sort(sort)
  }
  
  if (options.skip) {
    query = query.skip(options.skip)
  }
  
  if (options.take) {
    query = query.limit(options.take)
  }
  
  return query.lean().exec()
}

const update = async (where: any, data: any) => {
  await connectDB()
  if (where.id) {
    return SyncLog.findByIdAndUpdate(
      where.id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).lean().exec()
  }
  
  return SyncLog.findOneAndUpdate(
    where,
    { ...data, updatedAt: new Date() },
    { new: true }
  ).lean().exec()
}

export {
  SyncLog,
  create,
  findMany,
  update
} 