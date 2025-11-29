// api/config.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB";
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // --- CẤU HÌNH CORS (CHUẨN HÓA) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Cho phép mọi domain (cả localhost)
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS'); // Chỉ cho GET và OPTIONS
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý request OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    // ------------------------------------

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
                // Cấu hình cũ
                confetti_enabled: mainConfig.confetti_enabled !== false, // Mặc định true
                form_locked: mainConfig.can_delete || false, // Đổi tên biến cho dễ hiểu ở Client (can_delete cũ)

                // Cấu hình mới
                music_enabled: mainConfig.music_enabled !== false, // Mặc định true
                vinyl_enabled: mainConfig.vinyl_enabled !== false,
                wishes_popup_enabled: mainConfig.wishes_popup_enabled !== false,
                //particle_control_enabled: mainConfig.particle_control_enabled !== false,
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}