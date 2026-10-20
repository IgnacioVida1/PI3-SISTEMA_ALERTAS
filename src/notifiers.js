const axios = require('axios');
const pRetry = require('p-retry');
const config = require('./config');

const API_URL = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

async function sendFloodAlertOnce(userPhone, templateParams = []) {
    const payload = {
        messaging_product: 'whatsapp',
        to: userPhone,
        type: 'template',
        template: {
            name: config.templateName,
            language: { code: config.templateLang }
        },
        components: []
    };

    if (templateParams.length > 0) {
        payload.template.components = [
            {
                type: 'header',
                parameters: templateParams.map(text => ({type: 'text', text}))
            },
            {
                type: 'body',
                parameters: templateParams.map(text => ({type: 'text', text}))
            }
        ];
    }

    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Alerta enviada a ${userPhone}`, response.data.messages?.[0]?.id);
        return response.data;
    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error(`❌ Error al enviar alerta a ${userPhone}`, JSON.stringify(detail, null, 2));
        throw error;
    }
}

async function sendFloodAlert(userPhone, templateParams = []) {
    try {
        const result = await pRetry(
            () => sendFloodAlertOnce(userPhone, templateParams),
            {
                retries: 3,
                minTimeout: 1000,
                maxTimeout: 10000,
                factor: 2,
                onFailedAttempt: error => {
                    console.warn(
                        `Intento ${error.attemptNumber} falló para ${userPhone}. Quedan ${error.retriesLeft} reintentos.`
                    );
                }
            }
        );
        console.log(`✅ Alerta enviada exitosamente a ${userPhone}`, result.messages?.[0]?.id);
        return result;
    } catch ( error ) {
        const detail = error.response?.data || error.message;
        console.error(`❌ Error al enviar alerta a ${userPhone}`, JSON.stringify(detail, null, 2));
        throw error;
    }
}

module.exports = { sendFloodAlert };