const { MongoClient } = require('mongodb');
import { generateToken } from '../utils'; // Import hàm sinh token

// Lấy URI từ biến môi trường
const uri = "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        await client.connect();
        const db = client.db('WeddingDB');
        const settings = db.collection('settings');
        
        const config = await settings.findOne({ key: "main_config" });
        const adminPass = config ? config.admin_password : null;
        const { password } = req.body;

        if (password === adminPass) {
            // 1. Sinh Token Mới
            const newToken = generateToken();
            // 2. Tính thời gian hết hạn (Hiện tại + 24 giờ)
            const expiry = Date.now() + (24 * 60 * 60 * 1000);
            
            // 3. Lưu vào MongoDB
            await settings.updateOne(
                { key: "main_config" },
                { $set: { access_token: newToken, token_expiry: expiry } }
            );

            // 4. Trả về cho Client
            return res.status(200).json({ 
                result: 'success', 
                token: newToken,
                expiry: expiry 
            });
        } else {
            return res.status(401).json({ result: 'error', message: 'Mật khẩu không đúng' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}