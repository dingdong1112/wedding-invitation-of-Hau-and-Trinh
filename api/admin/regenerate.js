// api/admin/regenerate.js
const { MongoClient } = require('mongodb');

// Hàm sinh chuỗi ngẫu nhiên
const generateToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Lấy token hiện tại để xác thực trước khi cho đổi
    const clientToken = req.headers['authorization'];
    if (!clientToken) return res.status(401).json({ error: "Missing Token" });

    try {
        await client.connect();
        const db = client.db('WeddingDB');
        const settings = db.collection('settings');
        
        const config = await settings.findOne({ key: "main_config" });
        if (!config) return res.status(500).json({ error: "Config not found" });

        // Kiểm tra token hiện tại có hợp lệ không
        if (clientToken !== config.access_token || Date.now() > config.token_expiry) {
             return res.status(401).json({ error: "Unauthorized" });
        }

        // Sinh Token Mới & Hạn 1 ngày
        const newToken = generateToken();
        const expiry = Date.now() + (24 * 60 * 60 * 1000);

        await settings.updateOne(
            { key: "main_config" },
            { $set: { access_token: newToken, token_expiry: expiry } }
        );

        return res.status(200).json({ result: 'success', token: newToken });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}