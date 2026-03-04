const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Diagnostic Endpoint (Very useful for troubleshooting)
app.get('/debug/files', (req, res) => {
    const fs = require('fs');
    try {
        const files = fs.readdirSync(__dirname);
        const structure = files.map(f => {
            const stats = fs.statSync(path.join(__dirname, f));
            return { name: f, isDir: stats.isDirectory() };
        });
        res.json({ dirname: __dirname, files: structure });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Serve static files FIRST
app.use(express.static(__dirname));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- User Routes ---

// Register or Login user
app.post('/api/users/register', (req, res) => {
    console.log('Register request received:', req.body);
    const { id, name, email, phone, createdAt } = req.body;

    if (!id || !name || !email) {
        console.log('Validation failed: Missing fields', { id: !!id, name: !!name, email: !!email });
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        // Check if user exists
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (existingUser) {
            // Update existing user (e.g., update phone if provided)
            const updateStmt = db.prepare('UPDATE users SET name = ?, phone = ? WHERE email = ?');
            updateStmt.run(name, phone || existingUser.phone, email);

            const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            return res.status(200).json(updatedUser);
        }

        // Insert new user
        const insertStmt = db.prepare('INSERT INTO users (id, name, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)');
        insertStmt.run(id, name, email, phone || null, createdAt || new Date().toISOString());

        res.status(201).json({ id, name, email, phone, createdAt });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Get all users (for verification)
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// --- Raffle Routes (Placeholder) ---
app.get('/api/raffles', (req, res) => {
    const raffles = db.prepare('SELECT * FROM raffles').all();
    res.json(raffles);
});

app.listen(PORT, () => {
    console.log(`Servidor de RifaMax corriendo en http://localhost:${PORT}`);
});
