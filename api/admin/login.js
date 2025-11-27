// api/admin/login.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const settingsCollection = database.collection('settings');
        
        const mainConfig = await settingsCollection.findOne({ key: "main_config" });
        const adminPass = mainConfig ? mainConfig.admin_password : null;
        
        const { password } = req.body;

        if (password === adminPass) {
            // Trả về token cứng để Admin Panel sử dụng
            return res.status(200).json({ result: 'success', token: "VERCEL_ADMIN_TOKEN" });
        } else {
            return res.status(401).json({ result: 'error', message: 'Mật khẩu không đúng' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}