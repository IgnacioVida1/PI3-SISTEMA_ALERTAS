const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super_secreto_mvp_123';

const { sendFloodAlert } = require('./notifiers');

let currentFlow = 2;
let alertCooldown = false;
// Ajustado a los umbrales que mencionaste en tu código
const FLOW_THRESHOLDS = { yellow: 15, orange: 20, red: 27 }; 

function simulateFlow() {
  const step = (Math.random() * 0.8 - 0.3); //NOSONAR
  currentFlow = Math.max(0.5, Math.min(35, currentFlow + step)); 
  
  let status = 'Normal';
  let shouldAlert = false;
  let alertLevel = null;

  if (currentFlow >= FLOW_THRESHOLDS.red) {
    status = 'Rojo'; shouldAlert = true; alertLevel = 'Extrema';
  } else if (currentFlow >= FLOW_THRESHOLDS.orange) {
    status = 'Naranja'; shouldAlert = true; alertLevel = 'Fuerte';
  } else if (currentFlow >= FLOW_THRESHOLDS.yellow) {
    status = 'Amarillo'; shouldAlert = true; alertLevel = 'Media';
  }

  // Guardar en la base de datos
  db.saveRiverStatus(Number.parseFloat(currentFlow.toFixed(2)), status);

  if (shouldAlert && !alertCooldown) {
    alertCooldown = true;
    const users = db.getUsers();
    if (users.length > 0) {
      Promise.allSettled(users.map(u => sendFloodAlert(u.phone, [alertLevel])))
        .then(results => {
          const ok = results.filter(r => r.status === 'fulfilled').length;
          console.log(`🔔 Caudal ${currentFlow.toFixed(2)} m³/s → alerta ${alertLevel}. Enviadas: ${ok}/${users.length}`);
        }, error => {
          console.error('Error al procesar las alertas de caudal:', error);
        });
    }
    setTimeout(() => { alertCooldown = false; }, 60000);
  }

  return { flow: Number.parseFloat(currentFlow.toFixed(2)), status };
}

setInterval(simulateFlow, 3000);
simulateFlow();

const app = express(); //NOSONAR
app.use(cors({ origin: '*' })); //NOSONAR
app.use(express.json());

app.get('/api/telemetry/latest', (req, res) => {
  const latest = db.getLastRiverStatus();
  if (!latest) return res.json({ flow: currentFlow, status: 'Normal' });
  res.json({ flow: latest.flow, status: latest.status, updated_at: latest.updated_at });
});

app.post('/api/alert', async (req, res) => {
    const body = req.body || {};
    const { alert, level, river, timestamp } = body;

    if (typeof alert !== 'boolean') {
        return res.status(400).json({ error: 'Invalid alert value' });
    }

    if (!alert) {
        return res.json({ sent: 0, message: 'Sin alerta' });
    }

    if (!level) {
        return res.status(400).json({ error: 'Se requiere "level" cuando alert=true' });
    }
    
    console.log(`🔴 Alerta manual recibida: ${level} en ${river || 'río desconocido'}`);

    const users = db.getUsers();

    if (users.length === 0) {
        return res.json({ sent: 0, message: 'No hay usuarios registrados'});
    }

    const result = await Promise.allSettled(users.map(user => sendFloodAlert(user.phone, [level])));
    const exitos = result.filter(r => r.status === 'fulfilled').length;

    res.json({
        sent: exitos,
        failed: result.length - exitos,
        total: users.length,
        level,
        timestamp: timestamp || new Date().toISOString(),
    });
});

app.post('/api/users', async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Se requiere name, phone y password' });
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
    res.status(201).json({ id: newUser.id, name: newUser.name, phone: newUser.phone });
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
    console.log(`🚀 Servicio escuchando en puerto ${PORT}`);
    console.log(`📁 Base de datos SQLite conectada.`);
});