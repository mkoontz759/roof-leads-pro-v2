import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

// Define zip code schema
const ZipCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Model
export const ZipCode = mongoose.models.ZipCode || mongoose.model('ZipCode', ZipCodeSchema)

// Helper functions
export const findMany = async () => {
  await connectDB()
  return ZipCode.find({}).lean().exec()
}

export const findByCode = async (code: string) => {
  await connectDB()
  return ZipCode.findOne({ code }).lean().exec()
}

export const create = async (data: { code: string; city: string; state: string }) => {
  await connectDB()
  return ZipCode.create(data)
}

export const update = async (code: string, data: Partial<{ city: string; state: string }>) => {
  await connectDB()
  return ZipCode.findOneAndUpdate(
    { code },
    { ...data, updatedAt: new Date() },
    { new: true }
  ).lean().exec()
}

export const remove = async (code: string) => {
  await connectDB()
  return ZipCode.findOneAndDelete({ code }).lean().exec()
}

export const bulkCreate = async (zipCodes: Array<{ code: string; city: string; state: string }>) => {
  await connectDB()
  return ZipCode.insertMany(zipCodes)
}

export default {
  ZipCode,
  findMany,
  findByCode,
  create,
  update,
  remove,
  bulkCreate
} 