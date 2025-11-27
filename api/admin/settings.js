// api/admin/settings.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method Not Allowed' });

    const token = req.headers['authorization'];
    if (token !== "VERCEL_ADMIN_TOKEN") return res.status(401).json({ error: "Unauthorized" });

    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const settingsCollection = database.collection('settings');

        const { admin_password, ...settings } = req.body;
        
        const updateDoc = { $set: settings };
        if (admin_password) updateDoc.$set.admin_password = admin_password;

        await settingsCollection.updateOne({ key: "main_config" }, updateDoc);
        return res.status(200).json({ result: 'success' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}