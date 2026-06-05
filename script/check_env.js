const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env.local');
try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log("Environment Variables Check:");
    console.log("VITE_FIREBASE_PROJECT_ID:", envConfig.VITE_FIREBASE_PROJECT_ID ? (envConfig.VITE_FIREBASE_PROJECT_ID.substring(0, 5) + '...') : "UNDEFINED");
    console.log("VITE_FIREBASE_API_KEY:", envConfig.VITE_FIREBASE_API_KEY ? "DEFINED" : "UNDEFINED");
    console.log("VITE_FIREBASE_AUTH_DOMAIN:", envConfig.VITE_FIREBASE_AUTH_DOMAIN ? "DEFINED" : "UNDEFINED");
} catch (e) {
    console.error("Could not read .env.local:", e.message);
}
