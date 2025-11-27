// api/wishes.js
const { MongoClient } = require('mongodb');

// --- THAY CHUỖI KẾT NỐI CỦA BẠN VÀO DÒNG DƯỚI ĐÂY ---
const uri = "mongodb+srv://admin:hhh111!!!@weddingdb.p6k1yfo.mongodb.net/?appName=WeddingDB"; 

const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Cấu hình CORS để web không bị chặn
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Xử lý request OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Kết nối DB (Vercel sẽ cache kết nối này để chạy nhanh hơn ở lần sau)
        await client.connect();
        const database = client.db('WeddingDB'); // Tên Database tự đặt
        const collection = database.collection('wishes'); // Tên bảng lưu lời chúc

        // 1. LẤY DANH SÁCH LỜI CHÚC (GET)
        if (req.method === 'GET') {
            const wishes = await collection.find({}).sort({ _id: -1 }).toArray();
            
            // Trả về đúng định dạng mà file comment.js cần
            return res.status(200).json({
                result: 'success',
                data: wishes.map(w => ({ name: w.name, message: w.message }))
            });
        } 
        
        // 2. GỬI LỜI CHÚC MỚI (POST)
        else if (req.method === 'POST') {
            // Xử lý dữ liệu gửi lên (có thể là JSON hoặc FormData)
            let body = req.body;
            
            // Nếu gửi dạng FormData, Vercel đôi khi nhận là string, cần parse
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }

            // Lấy thông tin (Ưu tiên các tên trường thường dùng)
            const name = body.Ten || body.name;
            const message = body.LoiChuc || body.message;

            if (!name || !message) {
                return res.status(400).json({ error: 'Thiếu tên hoặc lời chúc' });
            }

            await collection.insertOne({
                name: name,
                message: message,
                createdAt: new Date()
            });

            return res.status(200).json({ result: 'success' });
        }
        
        // Phương thức không hỗ trợ
        else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error("Lỗi Server:", error);
        return res.status(500).json({ error: error.message });
    }
}