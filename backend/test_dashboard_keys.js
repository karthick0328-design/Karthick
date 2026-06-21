const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const testDashboardKeys = async () => {
    try {
        const token = fs.readFileSync('e:/biology/backend/admin_token.txt', 'utf8').trim();
        const response = await axios.get(`${API_URL}/api/adminassignments/dashboard?timeRange=30d`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const projects = response.data.data.projects;
        if (projects && projects.length > 0) {
            console.log("PROJECT_KEYS:", Object.keys(projects[0]).join(','));
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error.response?.data || error.message);
    }
};

testDashboardKeys();
