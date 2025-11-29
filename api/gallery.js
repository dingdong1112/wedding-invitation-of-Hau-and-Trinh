// api/gallery.js
const fs = require('fs/promises'); // Dùng Node.js file system
const path = require('path');

// Cấu hình Vercel để chạy trong thư mục gốc
export const config = {
    runtime: 'nodejs',
};

// ĐƯỜNG DẪN TỚI THƯ MỤC ẢNH
// process.cwd() là thư mục gốc của dự án trên Vercel
const ASSETS_PATH = path.join(process.cwd(), 'assets', 'images'); 
const BASE_URL = 'https://wedding-invitation-of-hau-and-chin.vercel.app'; // <--- THAY LINK CỦA BẠN

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // Lấy tham số ext (đuôi file) từ query string (mặc định là webp)
        const ext = req.query.ext ? req.query.ext.toLowerCase() : 'webp';

        const files = await fs.readdir(ASSETS_PATH);
        
        const imageUrls = files
            .filter(file => file.toLowerCase().endsWith('.' + ext))
            .map(file => `${BASE_URL}/assets/images/${file}`);

        res.status(200).json({
            success: true,
            files: imageUrls,
        });

    } catch (error) {
        console.error("Lỗi quét thư mục:", error);
        res.status(500).json({ success: false, error: 'Failed to read directory' });
    }
}