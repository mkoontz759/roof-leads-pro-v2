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
    timestamps: true
});

AgentSchema.set('maxTimeMS', 0);

const Agent = mongoose.model('Agent', AgentSchema);

Agent.getAllAgents = function(query = {}) {
    return this.find(query)
        .setOptions({ maxTimeMS: 0 })
        .hint({ memberKey: 1 })
        .lean();
};

module.exports = Agent;
