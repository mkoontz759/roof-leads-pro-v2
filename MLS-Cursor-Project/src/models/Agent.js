const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    memberKey: { 
        type: String, 
        required: true,
        unique: true
    },
    firstName: String,
    lastName: String,
    fullName: String,
    email: String,
    mlsId: String,
    officeName: String,
    phone: String,
    lastSync: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true,  // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true } // Include virtuals when converting to object
});

// Add virtual for name
AgentSchema.virtual('name').get(function() {
    return {
        first: this.firstName,
        last: this.lastName,
        full: this.fullName || `${this.firstName} ${this.lastName}`.trim()
    };
});

// Remove any default query limits
AgentSchema.set('maxTimeMS', 0);

const Agent = mongoose.model('Agent', AgentSchema);

// Add a static method to get all agents without limits
Agent.getAllAgents = function(query = {}) {
    return this.find(query)
        .setOptions({ maxTimeMS: 0 })
        .hint({ memberKey: 1 }) // Use the unique index
        .lean();
};

module.exports = Agent; 