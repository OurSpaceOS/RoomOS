require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { sequelize, Setting, User } = require('./db');

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'https://prospine.in/roomOS/server/public';

// A mock token or you can use your real localStorage token from browser to hit auth routes
const TOKEN = 'dummy-token'; 
const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json'
};

/**
 * Utility to fetch data and parse HTML errors natively 
 */
async function phpFetch(endpoint) {
    console.log(`Fetching ${PHP_BASE_URL}${endpoint}...`);
    try {
        const response = await axios.get(`${PHP_BASE_URL}${endpoint}`, { headers: HEADERS });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            const data = error.response.data;
            if (typeof data === 'string' && data.includes('<html')) {
                // PHP returned an HTML error instead of JSON API response
                const $ = cheerio.load(data);
                // Find custom error text depending on PHP framework, or just text representation
                const text = $('body').text().replace(/\s+/g, ' ').trim();
                console.warn(`[HTML WARNING from ${endpoint}]: ${text.substring(0, 100)}...`);
                return { _htmlError: true, text };
            }
            return data;
        }
        console.error(`[NETWORK ERROR for ${endpoint}]:`, error.message);
        return null;
    }
}

async function migrate() {
    console.log('--- STARTING ROOMOS MIGRATION ---');
    await sequelize.sync({ alter: true }); // Ensure DB is updated

    // 1. Migrate Users
    const membersData = await phpFetch('/group/members');
    if (membersData && membersData.members) {
        for (const m of membersData.members) {
            await User.upsert({
                id: m.id,
                name: m.name,
                email: m.email || null,
                groupId: m.group_id || 1,
            });
            console.log(`Migrated user: ${m.name}`);
        }
    } else {
         // Create some mock members if API failed
         console.warn('-- Creating fallback mock members because API failed to return JSON');
         await User.upsert({ id: 1, name: 'Swayam', groupId: 1 });
         await User.upsert({ id: 2, name: 'Nikhil', groupId: 1 });
         await User.upsert({ id: 3, name: 'Dev', groupId: 1 });
         await User.upsert({ id: 4, name: 'Sidhant', groupId: 1 });
    }

    // 2. Migrate Maid Config & Attendance
    console.log('Fetching Maid global config...');
    const configData = await phpFetch('/settings/group-get?key=maid_config');
    if (configData && configData.value) {
        // Upsert 
        await Setting.upsert({
            key: 'maid_config',
            date: null,
            groupId: 1,
            value: typeof configData.value === 'string' ? configData.value : JSON.stringify(configData.value)
        });
        console.log('Migrated Maid global config');

        // Let's migrate up to 60 days of past attendance 
        const now = new Date();
        const past = new Date();
        past.setDate(now.getDate() - 30);
        
        const fromStr = past.toISOString().split('T')[0];
        const toStr = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        console.log(`Fetching Maid attendance from ${fromStr} to ${toStr}`);
        const attData = await phpFetch(`/settings/group-get-range?key=maid_att&from=${fromStr}&to=${toStr}`);
        if (attData && attData.entries) {
            for (const item of attData.entries) {
                await Setting.upsert({
                    key: 'maid_att',
                    date: item.date,
                    groupId: 1,
                    value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value)
                });
            }
            console.log(`Migrated ${attData.entries.length} attendance records`);
        }
    } else {
        console.log('No Maid Config found on legacy server.');
    }

    // We can add more categories (tasks, transactions, routines) following this same pattern.
    console.log('--- MIGRATION COMPLETE ---');
}

migrate()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Migration failed:', e);
        process.exit(1);
    });
