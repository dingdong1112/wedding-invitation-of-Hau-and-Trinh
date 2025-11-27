// api/wishes.js
const { MongoClient } = require('mongodb');

// --- THAY CHUỖI KẾT NỐI CỦA BẠN VÀO DÒNG DƯỚI ĐÂY ---
const uri = "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 

if (!uri) {
    throw new Error('MONGO_URI is not defined.');
}

const client = new MongoClient(uri);

export const config = {
    api: {
        bodyParser: true, // Giữ nguyên để Vercel tự parse JSON/Form URL Encoded
    },
};

export default async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const wishesCollection = database.collection('wishes');
        const settingsCollection = database.collection('settings');
        
        // --- CHỨC NĂNG CHUNG (Lấy Config) ---
        const mainConfig = await settingsCollection.findOne({ key: "main_config" });
        const adminPass = mainConfig ? mainConfig.admin_password : null;

        // --- 1. LẤY DANH SÁCH LỜI CHÚC (GET) ---
        if (req.method === 'GET' && req.url === '/api/wishes') {
            const wishes = await wishesCollection.find({}).sort({ _id: -1 }).toArray();
            
            // Trả về dữ liệu lời chúc
            return res.status(200).json({
                result: 'success',
                data: wishes.map(w => ({ id: w._id, name: w.name, message: w.message, created_at: w.createdAt, presence: w.presence }))
            });
        } 
        
        // --- 2. LẤY CẤU HÌNH TRANG ADMIN/KHÁCH (GET /api/config) ---
        else if (req.method === 'GET' && req.url === '/api/config') {
             if (!mainConfig) return res.status(404).json({ error: 'Config not found' });
             // Chỉ trả về các trường cần thiết cho Frontend
             return res.status(200).json({
                 result: 'success',
                 data: {
                     can_delete: mainConfig.can_delete,
                     can_edit: mainConfig.can_edit,
                     can_reply: mainConfig.can_reply,
                     confetti_enabled: mainConfig.confetti_enabled,
                     per_page: mainConfig.per_page,
                 }
             });
        }

        // --- 3. GỬI LỜI CHÚC MỚI (POST) ---
        else if (req.method === 'POST') {
            const data = req.body; 
            const name = data.Ten; 
            const message = data.LoiChuc;
            const presence = data.ThamDu;

            if (!name || !message) {
                return res.status(400).json({ error: "Thiếu thông tin" });
            }
            
            await wishesCollection.insertOne({
                name: name,
                message: message,
                presence: presence,
                createdAt: new Date(),
                is_admin: false // Mặc định là khách thường
            });

            return res.status(200).json({ result: 'success' });
        }
        
        // --- 4. ĐĂNG NHẬP ADMIN (POST /api/admin/login) ---
        else if (req.method === 'POST' && req.url === '/api/admin/login') {
            const { password } = req.body;

            if (password === adminPass) {
                // Tạo một token đơn giản (có thể thay bằng JWT nếu cần bảo mật cao hơn)
                return res.status(200).json({ result: 'success', token: "VERCEL_ADMIN_TOKEN" });
            } else {
                return res.status(401).json({ result: 'error', message: 'Mật khẩu không đúng' });
            }
        }
        
        // --- 5. LƯU CẤU HÌNH ADMIN (PATCH /api/admin/settings) ---
        else if (req.method === 'PATCH' && req.url === '/api/admin/settings') {
            const token = req.headers['authorization'];
            if (token !== "VERCEL_ADMIN_TOKEN") return res.status(401).json({ error: "Unauthorized" });

            const { admin_password, ...settings } = req.body;
            
            // Xóa password cũ nếu admin muốn đổi
            const updateDoc = { $set: settings };
            if (admin_password) updateDoc.$set.admin_password = admin_password;

            await settingsCollection.updateOne({ key: "main_config" }, updateDoc);
            return res.status(200).json({ result: 'success' });
        }

        // --- 6. XÓA LỜI CHÚC (DELETE /api/wishes/:id) ---
        else if (req.method === 'DELETE' && req.url.startsWith('/api/wishes/')) {
            const token = req.headers['authorization'];
            if (token !== "VERCEL_ADMIN_TOKEN") return res.status(401).json({ error: "Unauthorized" });

            const id = req.url.split('/').pop();
            if (!id) return res.status(400).json({ error: 'Missing ID' });

            await wishesCollection.deleteOne({ _id: new ObjectId(id) });
            return res.status(200).json({ result: 'success' });
        }
        
        else {
            return res.status(404).json({ error: 'Not Found' });
        }

    } catch (error) {
        console.error("Lỗi Server:", error);
        return res.status(500).json({ error: error.message });
    }
}