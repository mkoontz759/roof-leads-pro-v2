const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    first: { type: String, required: true },
    last: { type: String, required: true }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: false
  },
  leadConnectorWebhook: {
    type: String,
    required: false
  },
  subscriptions: [{
    zipCode: String,
    active: Boolean,
    startDate: Date,
    endDate: Date,
    price: Number,
    autoRenew: { type: Boolean, default: true }
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has access to a specific zip code
userSchema.methods.hasZipCodeAccess = function(zipCode) {
  return this.subscriptions.some(sub => 
    sub.zipCode === zipCode && 
    sub.active && 
    sub.endDate > new Date()
  );
};

// Generate JWT Token
userSchema.methods.generateAuthToken = function() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role,
      name: `${this.name.first} ${this.name.last}`
    },
    secret,
    { expiresIn: '1d' }
  );
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  return this.save();
};

// Static method to get full user data including password
userSchema.statics.findByCredentials = async function(email) {
  return this.findOne({ email }).select('+password');
};

// Get

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
