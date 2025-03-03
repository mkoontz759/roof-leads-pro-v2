// Script to check the structure of a listing in the database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkListings() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Count all listings
    const totalCount = await mongoose.connection.collection('mls_listings').countDocuments();
    console.log(`Total listings: ${totalCount}`);
    
    // Check available statuses
    const statuses = await mongoose.connection.collection('mls_listings').distinct('standardFields.standardStatus');
    console.log('Available statuses:', statuses);
    
    // Alternative field to check
    const lifecycleStatuses = await mongoose.connection.collection('mls_listings').distinct('lifecycleStatus');
    console.log('Available lifecycle statuses:', lifecycleStatuses);
    
    // Check fields in a random listing
    const sampleListing = await mongoose.connection.collection('mls_listings').findOne();
    console.log('\nSample listing fields:');
    if (sampleListing) {
      console.log(Object.keys(sampleListing));
      
      // Check standardFields
      if (sampleListing.standardFields) {
        console.log('\nStandard fields:');
        console.log(Object.keys(sampleListing.standardFields));
      }
      
      // Get the first 3 listings to examine structure
      const listings = await mongoose.connection.collection('mls_listings').find().limit(3).toArray();
      console.log('\nSample listings (first 3):');
      listings.forEach((listing, i) => {
        console.log(`\nListing ${i+1}:`);
        console.log(JSON.stringify(listing, null, 2));
      });
    } else {
      console.log('No listings found in the database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkListings(); 