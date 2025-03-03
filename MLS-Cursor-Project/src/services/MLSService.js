const axios = require('axios');
const logger = require('./LoggerService');
const qs = require('querystring');
const Agent = require('../models/Agent');
const Listing = require('../models/Listing');
const DatabaseService = require('./DatabaseService');

class MLSService {
  constructor(logger) {
    if (!logger) {
      throw new Error('Logger is required for MLSService');
    }
    this.logger = logger;
    this.apiUrl = 'https://retsapi.raprets.com/2/LUBB/RESO/OData';
    this.authUrl = 'https://retsidentityapi.raprets.com/LUBB/oauth/token';
    this.clientId = process.env.MLS_CLIENT_ID || 'lab_lbk';
    this.clientSecret = process.env.MLS_CLIENT_SECRET;
    this.username = process.env.MLS_ID || 'lablbk';
    this.password = process.env.MLS_PASSWORD;
    this.authToken = null;
    this.tokenExpires = null;
    this.databaseService = new DatabaseService();
  }

  async authenticate() {
    try {
      this.logger.info('Authenticating with MLS:', {
        url: this.authUrl,
        clientId: this.clientId,
        username: this.username
      });

      const data = qs.stringify({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password
      });

      const response = await axios.post(this.authUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.authToken = response.data.access_token;
      this.tokenExpires = new Date(response.data['.expires']);

      this.logger.info('Successfully authenticated with MLS');
      return this.authToken;

    } catch (error) {
      this.logger.error('Authentication failed:', {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getNewPendingContracts() {
    try {
      if (!this.authToken || new Date() >= this.tokenExpires) {
        await this.authenticate();
      }

      // 1. Get pending transactions
      this.logger.info('Fetching pending transactions...');
      const pendingResponse = await axios.get(`${this.apiUrl}/Property`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        },
        params: {
          '$filter': "MlsStatus eq 'Under Contract'",
          '$select': 'ListingKey,ListPrice,ListAgentKey,StreetNumberNumeric,StreetName,City,StateOrProvince,PostalCode,ModificationTimestamp',
          '$top': '1000',
          '$orderby': 'ModificationTimestamp desc',
          'class': 'Residential'
        }
      });

      this.logger.info('Sample raw listing from MLS:', {
        rawListing: pendingResponse.data.value[0]
      });

      const pendingListings = pendingResponse.data.value.map(listing => ({
        listingKey: listing.ListingKey,
        listPrice: listing.ListPrice,
        listAgentKey: listing.ListAgentKey,
        address: {
          street: `${listing.StreetNumberNumeric || ''} ${listing.StreetName || ''}`.trim(),
          city: listing.City,
          state: listing.StateOrProvince,
          zip: listing.PostalCode
        },
        modificationTimestamp: listing.ModificationTimestamp
      }));

      this.logger.info(`Found ${pendingListings.length} pending listings`, {
        firstListing: pendingListings[0]
      });

      // 2. Get ALL active agents in one call
      this.logger.info('Fetching all active agents...');
      const agentsResponse = await axios.get(`${this.apiUrl}/ActiveAgents`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      });

      const agents = agentsResponse.data.value.map(agent => ({
        memberKey: agent.MemberKey,
        firstName: agent.MemberFirstName,
        lastName: agent.MemberLastName,
        fullName: agent.MemberFullName,
        email: agent.MemberEmail,
        mlsId: agent.MemberMlsId,
        officeName: agent.OfficeName,
        phone: agent.PreferredPhone,
        lastUpdated: agent.ModificationTimestamp
      }));

      this.logger.info(`Found ${agents.length} active agents`, {
        firstAgent: agents[0]
      });

      return {
        listings: pendingListings,
        agents: agents
      };
    } catch (error) {
      this.logger.error('Error in getNewPendingContracts:', error);
      throw error;
    }
  }

  async extractAgentInfo(listings) {
    try {
      if (!Array.isArray(listings)) {
        this.logger.warn('Listings is not an array, converting...', { 
          receivedType: typeof listings 
        });
        listings = listings?.value || []; // Try to extract value property or default to empty array
      }

      const agentInfo = listings.map(listing => {
        const address = [
          listing.StreetNumber,
          listing.StreetName,
          listing.City,
          listing.StateOrProvince,
          listing.PostalCode
        ].filter(Boolean).join(' ');

        return {
          mlsId: listing.ListAgentKey || listing.ListAgentMlsId,
          name: `${listing.ListAgentFirstName || ''} ${listing.ListAgentLastName || ''}`.trim(),
          email: listing.ListAgentEmail || null,
          phone: listing.ListAgentPhone || null,
          office: listing.ListOfficeName || '',
          lastSync: new Date(),
          listingInfo: {
            listingKey: listing.ListingKey,
            listPrice: listing.ListPrice,
            address: address || 'Address not available'
          }
        };
      }).filter(agent => agent.mlsId && agent.name);

      this.logger.info('Extracted agent info:', {
        count: agentInfo.length,
        firstAgent: agentInfo[0]
      });

      return agentInfo;
    } catch (error) {
      this.logger.error('Error extracting agent info:', error);
      throw error;
    }
  }

  async getMetadata() {
    try {
      if (!this.authToken || new Date() >= this.tokenExpires) {
        await this.authenticate();
      }

      this.logger.info('Fetching MLS service document');

      const response = await axios.get(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        },
        validateStatus: false
      });

      if (response.status !== 200) {
        this.logger.error('Service document request failed:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        throw new Error(`Service document request failed: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Available endpoints:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching service document:', {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getFieldsForEntity(entityName) {
    try {
      if (!this.authToken || new Date() >= this.tokenExpires) {
        await this.authenticate();
      }

      this.logger.info(`Fetching fields for ${entityName}`);

      const response = await axios.get(`${this.apiUrl}/Field`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        },
        params: {
          '$filter': `EntityName eq '${entityName}'`
        }
      });

      this.logger.info(`Available fields for ${entityName}:`, response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching fields for ${entityName}:`, error);
      throw error;
    }
  }

  async storeMLSData(data) {
    try {
        this.logger.info('Starting to store MLS data...');

        // Store agents first
        this.logger.info(`Storing ${data.agents.length} agents...`);
        const agentOps = data.agents.map(agent => ({
            updateOne: {
                filter: { memberKey: agent.memberKey },
                update: { $set: agent },
                upsert: true
            }
        }));
        const agentResult = await Agent.bulkWrite(agentOps);

        // Use DatabaseService to store listings with geocoding
        this.logger.info(`Storing ${data.listings.length} listings...`);
        await this.databaseService.saveListings(data.listings);

        this.logger.info('Successfully stored all MLS data');

        return {
            agents: {
                matched: agentResult.matchedCount,
                modified: agentResult.modifiedCount,
                upserted: agentResult.upsertedCount
            },
            listings: {
                total: data.listings.length
            }
        };
    } catch (error) {
        this.logger.error('Error storing MLS data:', error);
        throw error;
    }
  }

  async sendToLeadConnector(agentData) {
    try {
        const webhookUrl = 'https://services.leadconnectorhq.com/hooks/Y62qmRtqRD4ObH1vwkQ1/webhook-trigger/98e3e6b5-d59e-4b3b-9109-c9e8541d037d';

        const payload = {
            firstName: agentData.firstName,
            lastName: agentData.lastName,
            email: agentData.email,
            phone: agentData.phone,
            mlsId: agentData.mlsId,
            officeName: agentData.officeName,
            listingAddress: agentData.listingInfo?.address,
            listingPrice: agentData.listingInfo?.listPrice,
            lastUpdated: agentData.lastUpdated
        };

        this.logger.info('Sending to Lead Connector:', payload);

        const response = await axios.post(webhookUrl, payload);

        this.logger.info('Lead Connector response:', response.data);
        return response.data;

    } catch (error) {
        this.logger.error('Error sending to Lead Connector:', error.response?.data || error.message);
        throw error;
    }
  }

  async syncListings() {
    try {
        const mlsListings = await fetchMLSListings();

        for (const listing of mlsListings) {
            await Listing.findOneAndUpdate(
                { mlsNumber: listing.mlsNumber },
                {
                    ...listing,
                    status: listing.status,
                    lastSync: new Date()
                },
                { upsert: true, new: true }
            );
        }

        // Optional: Remove listings that are no longer pending
        await Listing.deleteMany({
            status: { $ne: 'Pending' }
        });

    } catch (error) {
        console.error('Error syncing listings:', error);
    }
  }
}

module.exports = MLSService; 