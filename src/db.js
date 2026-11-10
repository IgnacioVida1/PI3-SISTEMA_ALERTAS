const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, '..', 'database.sqlite'));

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS river_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow REAL,
    status TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const getUsers = () => {
    return db.prepare('SELECT * FROM users').all();
};

const getUsersByPhone = (phone) => {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
};

const createUser = (name, phone, password) => {
    const insert = db.prepare('INSERT INTO users (name, phone, password) VALUES (?, ?, ?)');
    const info = insert.run(name, phone, password);
    return { id: info.lastInsertRowid, name, phone, password }; // Corregido typo
};

const deleteUser = (id) => {
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    return deleteStmt.run(id);
};

const saveRiverStatus = (flow, status) => {
    const stmt = db.prepare('INSERT INTO river_status (flow, status) VALUES (?, ?)');
    return stmt.run(flow, status);
};

const getLastRiverStatus = () => {
    return db.prepare('SELECT * FROM river_status ORDER BY id DESC LIMIT 1').get();
};

module.exports = {
    getUsers,
    getUsersByPhone,
    createUser,
    deleteUser,
    saveRiverStatus,
    getLastRiverStatus
};