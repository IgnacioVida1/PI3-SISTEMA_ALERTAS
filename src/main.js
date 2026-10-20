const { registeredUsers } = require('./users');
const { sendFloodAlert } = require('./notifiers');

function simularDecision(isExtremeFlood) {
    if (isExtremeFlood) {
        return { alert: true, level: 'Extremo' };
    }
    return { alert: false, level: null };
}

async function processAlert() {
    const decision = simularDecision(true);

    if (!decision.alert) {
        console.log('🟢 No se requiere alerta de inundación.');
        return;
    }

    console.log(`🔴 Alerta de inundación: Nivel ${decision.level}`);

    const result = await Promise.allSettled(
        registeredUsers.map( user => sendFloodAlert(user.phone, []))
    );

    const exitos = result.filter(r => r.status === 'fulfilled').length;
    console.log(`📊 Resultado: ${exitos}/${registeredUsers.length} alertas enviadas.`);

    result.forEach((r, i) => {
    if (r.status === 'rejected') {
        console.error(`❌ Falló el envío a ${registeredUsers[i].phone}:`);
        console.error(JSON.stringify(r.reason?.response?.data || r.reason?.message, null, 2));
    }
});
}

processAlert().catch(err => {
    console.error('Error general: ', err);
    proccess.exit(1);
});