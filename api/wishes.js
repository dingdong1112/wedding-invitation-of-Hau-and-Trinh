// api/wishes.js - CHỈ XỬ LÝ LỜI CHÚC CỦA KHÁCH (GET/POST)
const { MongoClient } = require('mongodb');

// --- THAY CHUỖI KẾT NỐI CỦA BẠN VÀO DÒNG DƯỚI ĐÂY ---
const uri = "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 

if (!uri) {
    throw new Error('MONGO_URI is not defined.');
}

const client = new MongoClient(uri);

export const config = {
    api: {
        bodyParser: true,
    },
};

export default async function handler(req, res) {
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

        // --- 1. LẤY DANH SÁCH LỜI CHÚC (GET /api/wishes) ---
        if (req.method === 'GET' && req.url === '/api/wishes') {
            const wishes = await wishesCollection.find({}).sort({ _id: -1 }).toArray();

            return res.status(200).json({
                result: 'success',
                data: wishes.map(w => ({ id: w._id, name: w.name, message: w.message, created_at: w.createdAt, presence: w.presence }))
            });
        }

        // --- 2. GỬI LỜI CHÚC MỚI (POST /api/wishes) ---
        else if (req.method === 'POST' && req.url === '/api/wishes') {
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
                is_admin: false
            });

            return res.status(200).json({ result: 'success' });
        }
        
        // --- 3. CÁC API ADMIN KHÁC (Được xử lý trong file /api/admin/...) ---
        else {
             // Để tránh lỗi serverless không có API /api/wishes/id, ta trả 404 cho các URL khác
             return res.status(404).json({ error: 'Not Found' }); 
        }

    } catch (error) {
        console.error("Lỗi Server:", error);
        return res.status(500).json({ error: error.message });
    }
}