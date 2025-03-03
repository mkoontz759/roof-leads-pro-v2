const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Listing = require('../models/Listing');

class DatabaseService {
  constructor() {
    this.initializeDatabase().catch(console.error);
  }

  async initializeDatabase() {
    try {
      // Drop the existing collection to remove old indexes
      if (mongoose.connection.readyState === 1) { // Only if connected
        try {
          await mongoose.connection.collection('agents').drop();
        } catch (error) {
          // Collection might not exist, that's okay
          console.log('No existing collection to drop');
        }
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  async searchAgents({ 
    query = '', 
    page = 1, 
    limit = 10, 
    sortField = 'lastSync', 
    sortOrder = 'desc' 
  }) {
    try {
      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery = query ? {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { mlsId: { $regex: query, $options: 'i' } },
          { 'listingInfo.address': { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      } : {};

      // Get total count for pagination
      const total = await Agent.countDocuments(searchQuery);

      // Get paginated and sorted results
      const agents = await Agent.find(searchQuery)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean();

      // Format the results
      const formattedAgents = agents.map(agent => ({
        ...agent,
        listingInfo: {
          ...agent.listingInfo,
          listPrice: agent.listingInfo?.listPrice 
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format(agent.listingInfo.listPrice)
            : 'N/A'
        },
        lastSync: new Date(agent.lastSync).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      }));

      return {
        agents: formattedAgents,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          hasNext: skip + agents.length < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error searching agents:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalAgents, todaySyncs, lastSync] = await Promise.all([
        Agent.countDocuments(),
        Agent.countDocuments({ lastSync: { $gte: startOfToday } }),
        Agent.findOne().sort({ lastSync: -1 }).select('lastSync')
      ]);

      return {
        totalAgents,
        todaySyncs,
        lastSyncTime: lastSync 
          ? new Date(lastSync.lastSync).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })
          : 'Never'
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalAgents: 0,
        todaySyncs: 0,
        lastSyncTime: 'Error'
      };
    }
  }

  async saveAgents(agents) {
    try {
      const savedAgents = [];

      for (const agentData of agents) {
        const agent = await Agent.findOneAndUpdate(
          { memberKey: agentData.memberKey },
          {
            ...agentData,
            lastSync: new Date(),
            lastUpdated: new Date()
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );

        savedAgents.push(agent);
      }

      return savedAgents;
    } catch (error) {
      console.error('Error saving agents:', error);
      throw error;
    }
  }

  async getAgents() {
    try {
      return await Agent.getAllAgents()
        .sort({ lastUpdated: -1 });
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  async getTodaySyncs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return await Agent.countDocuments({
        lastSync: { $gte: today }
      });
    } catch (error) {
      console.error('Error counting today syncs:', error);
      throw error;
    }
  }

  async getLastSync() {
    try {
      const lastAgent = await Agent.findOne()
        .sort({ lastSync: -1 })
        .select('lastSync');

      return lastAgent?.lastSync || new Date();
    } catch (error) {
      console.error('Error getting last sync:', error);
      throw error;
    }
  }

  async getRecentAgents(limit = 10) {
    try {
      return await Agent.find()
        .sort({ lastSync: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching recent agents:', error);
      throw error;
    }
  }

  async geocodeAddress(address) {
    try {
      const formattedAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
      const encodedAddress = encodeURIComponent(formattedAddress);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=US`;

      console.log('Geocoding URL:', url); // Debug log

      const response = await fetch(url);
      const data = await response.json();

      console.log('Geocoding response:', data); // Debug log

      if (data.features && data.features[0]) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  async saveListing(listingData) {
    try {
      // Only geocode if we have a complete address and no coordinates
      if (
        listingData.address?.street &&
        listingData.address?.city &&
        listingData.address?.state &&
        listingData.address?.zip &&
        (!listingData.address?.lat || !listingData.address?.lng)
      ) {
        const coordinates = await this.geocodeAddress(listingData.address);
        if (coordinates) {
          listingData.address = {
            ...listingData.address,
            ...coordinates
          };
        }
      }

      return await Listing.findOneAndUpdate(
        { listingKey: listingData.listingKey },
        listingData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving listing:', error);
      throw error;
    }
  }

  async saveListings(listings) {
    console.log('Starting to save', listings.length, 'listings...');

    try {
        const operations = [];

        for (const listing of listings) {
            // First check if listing exists and has coordinates
            const existingListing = await Listing.findOne({ 
                listingKey: listing.listingKey,
                'address.lat': { $exists: true },
                'address.lng': { $exists: true }
            });

            // Only geocode if it's a new listing or doesn't have coordinates
            if (!existingListing) {
                const coordinates = await this.geocodeAddress(listing.address);
                if (coordinates) {
                    listing.address.lat = coordinates.lat;
                    listing.address.lng = coordinates.lng;
                }
            }

            operations.push({
                updateOne: {
                    filter: { listingKey: listing.listingKey },
                    update: {
                        $set: {
                            ...listing,
                            lastSync: new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        if (operations.length > 0) {
            const result = await Listing.bulkWrite(operations);
            console.log(`Successfully saved ${listings.length} listings`);
            return result;
        }

        return null;
    } catch (error) {
        console.error('Error saving listings:', error);
        throw error;
    }
  }

  async getListingsByStatus(status, isActive = true) {
    try {
      return await Listing.find({ 
        status: status,
        isActive: isActive
      }).lean();
    } catch (error) {
      console.error('Error getting listings by status:', error);
      throw error;
    }
  }

  async updateListingStatus(listingKey, newStatus) {
    try {
      return await Listing.findOneAndUpdate(
        { listingKey: listingKey },
        {
          $set: { status: newStatus },
          $push: {
            statusHistory: {
              status: newStatus,
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating listing status:', error);
      throw error;
    }
  }

  async getStatusHistory(listingKey) {
    try {
      const listing = await Listing.findOne(
        { listingKey: listingKey },
        { statusHistory: 1 }
      );
      return listing ? listing.statusHistory : [];
    } catch (error) {
      console.error('Error getting status history:', error);
      throw error;
    }
  }

  async getStatusStats() {
    try {
      return await Listing.aggregate([
        {
          $group: {
            _id: {
              status: '$status',
              isActive: '$isActive'
            },
            count: { $sum: 1 }
          }
        }
      ]);
    } catch (error) {
      console.error('Error getting status stats:', error);
      throw error;
    }
  }
}

// Export the class itself, not an instance
module.exports = DatabaseService; 