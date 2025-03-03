import { Schema, model, models } from 'mongoose'

const SyncHistorySchema = new Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: false },
  status: { 
    type: String, 
    enum: ['success', 'failed', 'in-progress'],
    required: true 
  },
  listingsProcessed: Number,
  agentsProcessed: Number,
  listingsUpserted: Number,
  agentsUpserted: Number,
  error: String,
  duration: Number // in milliseconds
})

SyncHistorySchema.index({ startTime: -1 })
SyncHistorySchema.index({ status: 1 })

export const SyncHistory = models.SyncHistory || model('SyncHistory', SyncHistorySchema) 