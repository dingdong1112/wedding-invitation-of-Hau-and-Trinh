// api/admin/login.js
const { MongoClient } = require('mongodb');

// Lấy URI từ biến môi trường
const uri = "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const settingsCollection = database.collection('settings');
        
        const mainConfig = await settingsCollection.findOne({ key: "main_config" });
        
        // Log để debug trên Vercel Dashboard (nếu cần)
        console.log("Config from DB:", mainConfig);

        // Lấy mật khẩu từ DB (trim để xóa khoảng trắng thừa nếu có)
        const adminPass = mainConfig && mainConfig.admin_password ? mainConfig.admin_password.trim() : null;
        
        // Xử lý body (hỗ trợ cả JSON string và Object)
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) {}
        }
        
        // Lấy mật khẩu người dùng nhập (cũng trim)
        const userPass = body.password ? body.password.trim() : "";

        console.log(`Input: ${userPass}, DB: ${adminPass}`); // Log so sánh

        if (userPass === adminPass) {
            return res.status(200).json({ result: 'success', token: "VERCEL_ADMIN_TOKEN" });
        } else {
            return res.status(401).json({ result: 'error', message: 'Mật khẩu không chính xác. Vui lòng thử lại.' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: error.message });
    }
}