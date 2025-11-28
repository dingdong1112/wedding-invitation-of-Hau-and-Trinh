// api/admin/regenerate.js
const { MongoClient } = require('mongodb');
import { generateToken, isValidToken } from '../utils';

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // ... (CORS) ...
    
    // Lấy token hiện tại từ Header để xác thực quyền Admin trước khi cho đổi
    const clientToken = req.headers['authorization'];

    try {
        await client.connect();
        const db = client.db('WeddingDB');
        const settings = db.collection('settings');
        const config = await settings.findOne({ key: "main_config" });

        // Kiểm tra quyền: Token gửi lên phải khớp và còn hạn
        if (!isValidToken(clientToken, config.access_token, config.token_expiry)) {
            return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." });
        }

        // Sinh Token Mới
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