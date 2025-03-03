import 'dotenv/config';
import fetch from 'node-fetch';

const getStatusOptions = async () => {
    try {
        const response = await fetch('http://retsapi.raprets.com/2/LBKP/RESO/OData/Lookup?$filter=LookupName eq \'MlsStatus\'', {
            headers: {
                'Authorization': `Bearer ${process.env.MLS_API_TOKEN}`
            }
        });
        const data = await response.json();
        console.log('Available Status Options:', data.value);
        return data.value;
    } catch (error) {
        console.error('Error fetching status options:', error);
    }
};

// Run the function
getStatusOptions(); 