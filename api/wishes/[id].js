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
        
        // --- XỬ LÝ DELETE (Xóa) ---
        if (req.method === 'DELETE') {
            const result = await wishesCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ result: 'error', message: 'Lời chúc không tồn tại' });
            }
            return res.status(200).json({ result: 'success', message: 'Đã xóa thành công' });
        } 
        
        // --- XỬ LÝ PUT (Sửa / Highlight) ---
        else if (req.method === 'PUT') {
            const body = req.body;
            const updateData = {};
            
            // Xây dựng Object update
            if (body.name) updateData.name = body.name;
            if (body.message) updateData.message = body.message;
            if (typeof body.is_highlight !== 'undefined') updateData.is_highlight = body.is_highlight;
            if (typeof body.presence !== 'undefined') updateData.presence = body.presence;

            const result = await wishesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Lời chúc không tồn tại' });
            }

            return res.status(200).json({ result: 'success' });
        }

    } catch (error) {
        // Bắt lỗi ID không đúng định dạng ObjectId
        return res.status(400).json({ error: 'Invalid ID format' }); 
    }
}