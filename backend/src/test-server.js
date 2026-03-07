// Test script to see server errors
console.log('Starting test...');
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  console.log('Loaded .env');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  
  require('./server.js');
} catch (error) {
  console.error('Error loading server:');
  console.error(error);
  process.exit(1);
}
