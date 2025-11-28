// api/admin/settings.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB";
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // --- 1. Cấu hình CORS (Giữ nguyên) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method Not Allowed' });

    const clientToken = req.headers['authorization'];
    if (!clientToken) return res.status(401).json({ error: "Missing Token" });

    try {
        // --- 2. Kết nối DB ---
        await client.connect();
        const database = client.db('WeddingDB');
        const settingsCollection = database.collection('settings');

        // --- 3. LOGIC KIỂM TRA TOKEN ĐỘNG (MỚI) ---
        // Lấy config hiện tại từ DB
        const config = await settingsCollection.findOne({ key: "main_config" });
        
        if (!config) return res.status(500).json({ error: "Config not found in DB" });

        const dbToken = config.access_token;
        const dbExpiry = config.token_expiry;
        const now = Date.now();

        // Kiểm tra 2 điều kiện: Token khớp VÀ Chưa hết hạn
        if (clientToken !== dbToken || now > dbExpiry) {
            return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." });
        }

        // --- 4. XỬ LÝ LƯU CẤU HÌNH (Khi Token đã OK) ---
        const { admin_password, old_password, ...settings } = req.body;
        const updateDoc = { $set: settings };

        // Logic đổi mật khẩu (Giữ nguyên)
        if (admin_password) {
            if (!old_password) return res.status(400).json({ result: 'error', message: 'Thiếu mật khẩu cũ.' });
            if (old_password !== config.admin_password) return res.status(400).json({ result: 'error', message: 'Mật khẩu cũ sai.' });
            updateDoc.$set.admin_password = admin_password;
        }

        await settingsCollection.updateOne({ key: "main_config" }, updateDoc);
        return res.status(200).json({ result: 'success' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}