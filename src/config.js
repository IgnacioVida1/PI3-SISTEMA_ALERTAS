require('dotenv').config();

const requiredVars = [
    'META_PHONE_NUMBER_ID',
    'META_ACCESS_TOKEN',
    'META_API_VERSION',
];

for (const varName of requiredVars) {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
}

module.exports = {
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    accessToken: process.env.META_ACCESS_TOKEN,
    apiVersion: process.env.META_API_VERSION,
    templateName: process.env.TEMPLATE_NAME || 'hello_world',
    templateLang: process.env.TEMPLATE_LANG || 'en_US',
    port: process.env.PORT || 3000,
}