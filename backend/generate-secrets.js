const crypto = require('crypto');

const generateSecret = (length = 64) => {
    return crypto.randomBytes(length).toString('base64');
};

console.log('--- PRODUCTION SECRETS GENERATOR ---');
console.log('JWT_SECRET:');
console.log(generateSecret(64));
console.log('\nSESSION_SECRET:');
console.log(generateSecret(32));
console.log('------------------------------------');
console.log('Instructions: Copy these values into your .env file in the production environment.');
console.log('Keep these secrets secure and never share them.');
