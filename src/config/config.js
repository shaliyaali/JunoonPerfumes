require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI,
    sessionSecret: process.env.SESSION_SECRET,


    
    nodeEnv: process.env.NODE_ENV || 'development',
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
    },
    nodemailer: {
        email: process.env.NODEMAILER_EMAIL,
        password: process.env.NODEMAILER_PASSWORD,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    }
};

// Basic validation to ensure critical variables are present
const requiredVars = [
    'MONGO_URI',
    'SESSION_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
];

requiredVars.forEach((key) => {
    if (!process.env[key]) {
        console.error(`[CONFIG ERROR] Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

module.exports = config;
