const express = require('express');
const db = require('./db');
const { sendFloodAlert } = require('./notifiers');

const app = express();
app.use(express.json());

app.post('/api/alert', async (req, res) => {
    const body = req.body || {};
    const { alert, level, river, timestamp } = body;

    if (typeof alert !== 'boolean') {
        return res.status(400).json({ error: 'Invalid alert value' });
    }

    if (!alert) {
        console.log('🟢 Sin alerta. No se envía notificación.');
        return res.json({ sent: 0, message: 'Sin alerta' });
    }

    if (!level) {
        return res.status(400).json({ error: 'Se requiere "level" cuando alert=true' });
    }
    
    console.log(`🔴 Alerta recibida: ${level} en ${river || 'río desconocido'}`);

    const users = db.getUsers();

    if (users.length === 0) {
        return res.json({ sent: 0, message: 'No hay usuarios registrados'});
    }

    const result = await Promise.allSettled(users.map(user => sendFloodAlert(user.phone, [level])));

    const exitos = result.filter(r => r.status === 'fulfilled').length;
    const fallos = result.length - exitos;

    result.forEach((r, index) => {
        if (r.status === 'rejected') {
            console.error(`Error al enviar notificación a ${registeredUsers[index].phone}:`, 
                r.reason?.response?.data || r.reason?.message);
        }
    });

    res.json({
        sent: exitos,
        failed: fallos,
        total: users.length,
        level,
        timestamp: timestamp || new Date().toISOString(),
    });
});

app.post('/api/users', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Se requiere name y phone' });
  }

  const normalized = phone.replace(/[+\s-]/g, '');
  try {
    const existingUser = db.getUsersByPhone(normalized);
    if (existingUser) {
        return res.status(400).json({ error: "Este numero ya esta registrado" });
    }
    const newUser = db.createUser(name, normalized);
    console.log(`👤 Usuario registrado: ${name} (${normalized})`);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/users', (req, res) => {
  const users = db.getUsers();
  res.json(users);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servicio de notificaciones escuchando en puerto ${PORT}`);
    console.log(`📁 Base de datos SQLite conectada.`);
});