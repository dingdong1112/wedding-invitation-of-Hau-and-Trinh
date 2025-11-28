// api/wishes.js
const { MongoClient, ObjectId } = require('mongodb'); // Thêm ObjectId để xóa theo ID

// --- URI GIỮ NGUYÊN ---
const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 

if (!uri) throw new Error('MONGO_URI is not defined.');
const client = new MongoClient(uri);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
    // CORS GIỮ NGUYÊN
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const wishesCollection = database.collection('wishes');
        const settingsCollection = database.collection('settings'); // Thêm dòng này để lấy Config Token

        // --- 1. LẤY DANH SÁCH (GET) ---
        if (req.method === 'GET' && (req.url === '/api/wishes' || req.url.startsWith('/api/wishes?'))) {
            // ... (Code cũ giữ nguyên)
            const wishes = await wishesCollection.find({}).sort({ _id: -1 }).toArray();
            return res.status(200).json({
                result: 'success',
                data: wishes.map(w => ({ id: w._id, name: w.name, message: w.message, created_at: w.createdAt, presence: w.presence }))
            });
        }

        // --- 2. GỬI LỜI CHÚC (POST) ---
        else if (req.method === 'POST' && req.url === '/api/wishes') {
            // ... (Code cũ giữ nguyên)
            const data = req.body;
            // ... (Logic lưu vào DB)
            await wishesCollection.insertOne({
                name: data.Ten, message: data.LoiChuc, presence: data.ThamDu, createdAt: new Date()
            });
            return res.status(200).json({ result: 'success' });
        }
        
       

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}