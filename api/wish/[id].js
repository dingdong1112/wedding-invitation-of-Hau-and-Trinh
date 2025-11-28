// api/wishes/[id].js (Xử lý DELETE cho một ID cụ thể)
const { MongoClient, ObjectId } = require('mongodb');

// URI đã được xác định ở file wishes.js
const uri = process.env.MONGO_URI || "mongodb+srv://admin:admin0123@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB";
if (!uri) throw new Error('MONGO_URI is not defined.');
const client = new MongoClient(uri);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method Not Allowed' });

    // Lấy ID từ URL (Vercel tự động đặt tham số động vào req.query)
    const { id } = req.query; 

    if (!id) return res.status(400).json({ error: 'Missing ID' });

    try {
        await client.connect();
        const database = client.db('WeddingDB');
        const wishesCollection = database.collection('wishes');

        // MongoDB yêu cầu ID phải là ObjectId
        const result = await wishesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ result: 'error', message: 'Lời chúc không tồn tại' });
        }

        return res.status(200).json({ result: 'success', message: 'Đã xóa thành công' });

    } catch (error) {
        // Lỗi này thường do ID không đúng format ObjectId
        return res.status(400).json({ error: 'Invalid ID format' }); 
    }
}