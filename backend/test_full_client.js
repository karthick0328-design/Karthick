const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const testFullClient = async () => {
    try {
        const token = fs.readFileSync('e:/biology/backend/admin_token.txt', 'utf8').trim();
        const response = await axios.get(`${API_URL}/api/adminassignments/clients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Full client object:", JSON.stringify(response.data.data?.[0], null, 2));
    } catch (error) {
        console.error('Error fetching clients:', error.response?.data || error.message);
    }
};

testFullClient();
