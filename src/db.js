const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, '..', 'database.sqlite'));

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const getUsers = () => {
    return db.prepare('SELECT * FROM users').all();
};

const getUsersByPhone = (phone) => {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
};

const createUser = (name, phone) => {
    const insert = db.prepare('INSERT INTO users (name, phone) VALUES (?, ?)');
    const info = insert.run(name, phone);
    return { id: info.lastInsertRowidm, name, phone };
};

const deleteUser = (id) => {
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    return deleteStmt.run(id);
};

module.exports = {
    getUsers,
    getUsersByPhone,
    createUser,
    deleteUser
}