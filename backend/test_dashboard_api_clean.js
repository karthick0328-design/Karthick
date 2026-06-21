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
        const projects = response.data.data.projects;
        if (projects && projects.length > 0) {
            console.log("PROJECT_START");
            console.log(JSON.stringify(projects[0], null, 2));
            console.log("PROJECT_END");
        } else {
            console.log("NO_PROJECTS");
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error.response?.data || error.message);
    }
};

testDashboard();
