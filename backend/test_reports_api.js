const axios = require('axios');
const fs = require('fs');

async function test() {
    const token = fs.readFileSync('admin_token.txt', 'utf8').trim();
    try {
        const res = await axios.get('http://localhost:5000/api/project-service-complaints/reports', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('API RESPONSE:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}
test();
