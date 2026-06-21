const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const testDashboard = async () => {
    try {
        const token = fs.readFileSync('e:/biology/backend/admin_token.txt', 'utf8').trim();
        const response = await axios.get(`${API_URL}/api/adminassignments/dashboard?timeRange=30d`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(JSON.stringify(response.data.data.projects?.slice(0, 2), null, 2));
        console.log("Line Graph Data:", JSON.stringify(response.data.data.lineGraphData?.slice(0, 2), null, 2));
    } catch (error) {
        console.error('Error fetching dashboard:', error.response?.data || error.message);
    }
};

testDashboard();
