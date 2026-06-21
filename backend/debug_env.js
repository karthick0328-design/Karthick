console.log(`NODE_ENV: [${process.env.NODE_ENV}]`);
console.log(`is equal to 'development': ${process.env.NODE_ENV === 'development'}`);
if (process.env.NODE_ENV && process.env.NODE_ENV.includes('development')) {
    console.log('Includes development');
}
