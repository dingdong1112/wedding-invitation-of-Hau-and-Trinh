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

        // Lấy thông tin Token hiện tại trong DB
        const currentToken = config.access_token;
        const currentExpiry = config.token_expiry;

        if (password === adminPass) {
            const now = Date.now();
            let tokenToReturn = currentToken;
            let expiryToReturn = currentExpiry;

            // LOGIC TỐI ƯU: Chỉ tạo mới nếu chưa có hoặc đã hết hạn (hoặc sắp hết hạn trong 1 tiếng)
            // 24h = 86400000ms
            if (!currentToken || !currentExpiry || now > currentExpiry) {
                // Tạo mới
                tokenToReturn = generateToken();
                expiryToReturn = now + (24 * 60 * 60 * 1000); // +24h

                await settings.updateOne(
                    { key: "main_config" },
                    { $set: { access_token: tokenToReturn, token_expiry: expiryToReturn } }
                );
            }
            // Nếu còn hạn thì giữ nguyên, không update DB

            return res.status(200).json({
                result: 'success',
                token: tokenToReturn,
                expiry: expiryToReturn
            });
        } else {
            return res.status(401).json({ result: 'error', message: 'Mật khẩu không đúng' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}