const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const checkProjectKeys = async () => {
    try {
        const token = fs.readFileSync('e:/biology/backend/admin_token.txt', 'utf8').trim();
        const response = await axios.get(`${API_URL}/api/adminassignments/projects/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.data?.[0]) {
            console.log("Project Keys:", Object.keys(response.data.data[0]));
            console.log("userId Type:", typeof response.data.data[0].userId);
            console.log("userId Value:", response.data.data[0].userId);
        }
    } catch (error) {
        console.error('Error fetching projects:', error.response?.data || error.message);
    }
};

checkProjectKeys();
