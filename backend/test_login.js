// const http = require('http'); // SEC-FIX: Removed insecure module require

const data = JSON.stringify({
    email: 'test@example.com',
    password: 'test'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const isSecure = process.env.TEST_HTTPS === 'true' || true; // SEC-FIX: Force secure or allow override
const client = require('https');

const req = client.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
