const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super_secreto_mvp_123';

const { sendFloodAlert } = require('./notifiers');

const app = express();
app.use(cors({
    origin: '*'
}));
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

app.post('/api/users', async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Se requiere name, phone o password' });
  }

  const normalized = phone.replace(/[+\s-]/g, '');
  try {
    const existingUser = db.getUsersByPhone(normalized);
    if (existingUser) {
        return res.status(400).json({ error: "Este numero ya esta registrado" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = db.createUser(name, normalized, hashedPassword);

    console.log(`👤 Usuario registrado: ${name} (${normalized})`);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const normalized = phone.replace(/[+\s-]/g, '');
    
    const user = db.getUsersByPhone(normalized);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Generar Token JWT
    const token = jwt.sign({ id: user.id, name: user.name }, SECRET_KEY, { expiresIn: '2h' });
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone } });
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