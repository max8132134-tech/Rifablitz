const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Mercado Pago Configuration
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-3993412586616089-031011-396781226065408a6b18a1a383848123-2313670987' // DEMO ACCESS TOKEN - REEMPLAZAR CON EL REAL
});

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
app.post('/api/users/register', async (req, res) => {
    console.log('Register request received:', req.body);
    const { id, name, email, phone, createdAt } = req.body;

    if (!id || !name || !email) {
        console.log('Validation failed: Missing fields', { id: !!id, name: !!name, email: !!email });
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        console.log('Checking if user exists:', email);
        const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (existingUser) {
            console.log('User exists, updating:', email);
            const updateStmt = db.prepare('UPDATE users SET name = ?, phone = ? WHERE email = ?');
            await updateStmt.run(name, phone || existingUser.phone, email);

            const updatedUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            console.log('Update complete, sending response');
            return res.status(200).json(updatedUser);
        }

        console.log('New user, inserting:', email);
        const insertStmt = db.prepare('INSERT INTO users (id, name, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)');
        await insertStmt.run(id, name, email, phone || null, createdAt || new Date().toISOString());

        console.log('Insert complete, sending response');
        res.status(201).json({ id, name, email, phone, createdAt });
    } catch (error) {
        console.error('CRITICAL Registration error:', error);
        res.status(500).json({ error: 'Error al registrar el usuario: ' + error.message });
    }
});

// Get all users (for verification)
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.prepare('SELECT * FROM users').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// --- Raffle Routes ---

// Create Raffle
app.post('/api/raffles', async (req, res) => {
    console.log('Create raffle request:', JSON.stringify(req.body, null, 2));
    const raffle = req.body;

    if (!raffle.id || !raffle.ownerId || !raffle.title) {
        console.warn('Missing raffle fields:', { id: !!raffle.id, ownerId: !!raffle.ownerId, title: !!raffle.title });
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO raffles (id, ownerId, ownerName, title, description, ticketPrice, totalTickets, drawDate, imageUrl, status, createdAt, tickets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.run(
            raffle.id,
            raffle.ownerId,
            raffle.ownerName || 'Desconocido',
            raffle.title,
            raffle.description || null,
            parseFloat(raffle.ticketPrice) || 0,
            parseInt(raffle.totalTickets) || 0,
            raffle.drawDate || '',
            raffle.imageUrl || null,
            raffle.status || 'active',
            raffle.createdAt || new Date().toISOString(),
            JSON.stringify(raffle.tickets || [])
        );

        console.log('Raffle created successfully:', raffle.id);
        res.status(201).json(raffle);
    } catch (error) {
        console.error('CRITICAL ERROR: Create raffle failed:', error);
        res.status(500).json({ error: 'Error al crear la rifa: ' + error.message });
    }
});

// Get All Raffles
app.get('/api/raffles', async (req, res) => {
    try {
        const raffles = await db.prepare('SELECT * FROM raffles').all();
        // Parse tickets JSON for each raffle
        const parsedRaffles = raffles.map(r => ({
            ...r,
            tickets: typeof r.tickets === 'string' ? JSON.parse(r.tickets) : (r.tickets || [])
        }));
        res.json(parsedRaffles);
    } catch (error) {
        console.error('Error fetching raffles:', error);
        res.status(500).json({ error: 'Error al obtener rifas' });
    }
});

// Update Raffle (Purchase or Draw)
app.put('/api/raffles/:id', async (req, res) => {
    const { status, winnerId, winnerName, winnerTicket, tickets } = req.body;

    try {
        const stmt = db.prepare(`
            UPDATE raffles 
            SET status = ?, winnerId = ?, winnerName = ?, winnerTicket = ?, tickets = ?
            WHERE id = ?
        `);

        await stmt.run(
            status,
            winnerId || null,
            winnerName || null,
            winnerTicket || null,
            JSON.stringify(tickets),
            req.params.id
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update raffle error:', error);
        res.status(500).json({ error: 'Error al actualizar la rifa' });
    }
});

// Get Raffle by ID
app.get('/api/raffles/:id', async (req, res) => {
    try {
        const raffle = await db.prepare('SELECT * FROM raffles WHERE id = ?').get(req.params.id);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa no encontrada' });
        }
        res.json({
            ...raffle,
            tickets: typeof raffle.tickets === 'string' ? JSON.parse(raffle.tickets) : (raffle.tickets || [])
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la rifa' });
    }
});

// --- Payment Routes ---

// Create Mercado Pago Preference
app.post('/api/payments/create-preference', async (req, res) => {
    const { raffleId, userId, userName, tickets: selectedTicketNumbers } = req.body;

    if (!raffleId || !userId || !selectedTicketNumbers || selectedTicketNumbers.length === 0) {
        return res.status(400).json({ error: 'Faltan datos para crear la preferencia' });
    }

    try {
        // 1. Get raffle and validate tickets
        const raffle = await db.prepare('SELECT * FROM raffles WHERE id = ?').get(raffleId);
        if (!raffle) return res.status(404).json({ error: 'Rifa no encontrada' });

        const tickets = typeof raffle.tickets === 'string' ? JSON.parse(raffle.tickets) : (raffle.tickets || []);
        
        // Check if any of the selected tickets are already sold
        const invalidTickets = selectedTicketNumbers.filter(num => {
            const t = tickets.find(t => t.number === num);
            return !t || t.buyerId;
        });

        if (invalidTickets.length > 0) {
            return res.status(400).json({ error: `Los boletos ${invalidTickets.join(', ')} ya no están disponibles.` });
        }

        // 2. Create MP Preference
        const preference = new Preference(client);
        const totalPrice = Math.round(parseFloat(raffle.ticketPrice) * selectedTicketNumbers.length * 100) / 100; // Force 2 decimals

        if (isNaN(totalPrice) || totalPrice <= 0) {
            return res.status(400).json({ error: 'El precio total no es válido.' });
        }

        const origin = req.headers.origin || `http://localhost:${PORT}`;

        const response = await preference.create({
            body: {
                items: [
                    {
                        id: raffleId,
                        title: `Boletos Rifa: ${raffle.title} (#${selectedTicketNumbers.join(', #')})`,
                        quantity: 1,
                        unit_price: totalPrice,
                        currency_id: 'MXN'
                    }
                ],
                metadata: {
                    raffle_id: raffleId,
                    user_id: userId,
                    user_name: userName,
                    tickets: selectedTicketNumbers
                },
                back_urls: {
                    success: `${origin}/raffle.html?id=${raffleId}&payment=success`,
                    failure: `${origin}/raffle.html?id=${raffleId}&payment=failure`,
                    pending: `${origin}/raffle.html?id=${raffleId}&payment=pending`
                },
                auto_return: 'approved',
                notification_url: 'https://rhinal-wilbur-humoresquely.ngrok-free.dev/api/payments/webhook' // REEMPLAZAR CON URL PUBLICA (NGROK/LOCALTUNNEL)
            }
        });

        res.json({ id: response.id, init_point: response.init_point });
    } catch (error) {
        console.error('CRITICAL Preference Error Details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            apiResponse: error.api_response ? error.api_response.status : 'N/A'
        });
        res.status(500).json({ 
            error: 'Error al crear la preferencia de pago',
            details: error.message 
        });
    }
});

// Mercado Pago Webhook
app.post('/api/payments/webhook', async (req, res) => {
    const { action, data } = req.body;
    console.log(`Webhook received: ${action}`, data);

    // This is a simplified version for the demo. 
    // In production, you MUST fetch the payment from MP to verify it's approved.
    if (req.query.type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
        try {
            const paymentId = data?.id || req.query['data.id'];
            
            // SIMULATED: Getting payment details
            // In a real app: const payment = await new Payment(client).get({ id: paymentId });
            // For now, we'll use a mock check. If it's a real MP request, we'd verify status === 'approved'.
            
            console.log(`Processing payment ID: ${paymentId}`);
            
            // To make this demo work without a public URL for the real webhook:
            // The frontend 'back_url' success redirect can also be used as a fallback,
            // though webhooks are the "correct" way.

            res.sendStatus(200); 
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(200);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de RifaMax corriendo en http://localhost:${PORT}`);
});
