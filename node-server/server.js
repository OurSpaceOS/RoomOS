require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, Setting, User } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Basic authentication middleware mock (in reality, you'd decode JWTs)
// For local testing, we might just assume auth or pass tokens.
const authenticate = (req, res, next) => {
    // In a full migration, you verify JWT. For now, we trust the front-end token.
    next();
};

app.get('/', (req, res) => {
    res.json({ message: 'Node.js backend running' });
});

// Mock settings routes to mimic PHP server behavior 
app.get('/group/members', authenticate, async (req, res) => {
    try {
        const users = await User.findAll();
        res.json({ members: users });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/settings/group-get', authenticate, async (req, res) => {
    const { key } = req.query;
    try {
        const setting = await Setting.findOne({ where: { key, date: null } });
        if (setting) {
            res.json({ value: setting.value });
        } else {
            res.json({ value: null });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/settings/group-set', authenticate, async (req, res) => {
    const { key, value, date } = req.body;
    try {
        // Upsert setting
        let setting = await Setting.findOne({ where: { key, date: date || null } });
        if (setting) {
            setting.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await setting.save();
        } else {
            setting = await Setting.create({ 
               key, 
               value: typeof value === 'object' ? JSON.stringify(value) : String(value), 
               date: date || null 
            });
        }
        res.json({ success: true, setting });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/settings/group-get-range', authenticate, async (req, res) => {
    const { key, from, to } = req.query;
    const { Op } = require('sequelize');
    try {
        // Return entries between from and to
        const settings = await Setting.findAll({
            where: {
                key,
                date: {
                    [Op.gte]: from,
                    [Op.lte]: to
                }
            }
        });
        
        const entries = settings.map(s => ({
            date: s.date,
            value: s.value
        }));
        
        res.json({ entries });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Add a fallback route for anything not implemented yet
app.all('*', (req, res) => {
    console.log(`Fallback unhandled route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Endpoint not found or not migrated yet to Node.js' });
});

const PORT = process.env.PORT || 3001;

sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}).catch(e => {
    console.error('Failed to sync db:', e);
});
