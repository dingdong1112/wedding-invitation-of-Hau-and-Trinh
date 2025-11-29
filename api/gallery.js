// api/gallery.js
import fs from 'fs/promises';
import path from 'path';

// Cấu hình Vercel để chạy trong thư mục gốc
export const config = {
    runtime: 'nodejs',
};

// ĐƯỜNG DẪN TUYỆT ĐỐI TỚI THƯ MỤC CÔNG KHAI
const ASSETS_PATH = path.join(process.cwd(), 'assets', 'images'); 
const BASE_URL = 'https://wedding-invitation-of-hau-and-chin.vercel.app'; // Thay URL của bạn

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // Lấy tham số ext (ví dụ: jpg, webp) từ query string
        const { ext } = req.query;
        const extension = ext ? ext.toLowerCase() : 'webp';

        const files = await fs.readdir(ASSETS_PATH);
        
        const imageUrls = files
            .filter(file => file.toLowerCase().endsWith('.' + extension))
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