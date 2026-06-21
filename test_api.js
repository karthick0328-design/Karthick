
const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const response = await axios.get('http://localhost:5000/api/email-campaign/project-emails', {
            headers: { 'Authorization': 'Bearer ' + process.argv[2] }
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(error.message);
        if (error.response) console.error(error.response.data);
    }
}

test();
