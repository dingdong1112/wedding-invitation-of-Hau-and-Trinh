// api/config.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const settingsCollection = database.collection('settings');
        
        const mainConfig = await settingsCollection.findOne({ key: "main_config" });
        
        if (!mainConfig) return res.status(404).json({ error: 'Config not found' });
        
        return res.status(200).json({
            result: 'success',
            data: {
                can_delete: mainConfig.can_delete || false,
                confetti_enabled: mainConfig.confetti_enabled || false,
                // Giả lập các trường cũ để Admin Panel không bị crash
                can_edit: mainConfig.can_edit || false,
                can_reply: mainConfig.can_reply || false,
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}