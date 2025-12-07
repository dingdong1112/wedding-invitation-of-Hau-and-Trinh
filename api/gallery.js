// api/gallery.js
const fs = require('fs');
const path = require('path');

export const config = {
    runtime: 'nodejs',
};

export default async function handler(req, res) {
    // Cho phép gọi từ mọi nơi (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache kết quả API trong 1 giờ

    try {
        // 1. Xác định đường dẫn
        // Cố gắng tìm trong folder public trước (Chuẩn Vercel), nếu không thấy thì tìm ở root
        let directoryPath = path.join(process.cwd(), 'public', 'assets', 'images');
        
        if (!fs.existsSync(directoryPath)) {
            // Fallback: Tìm ở thư mục gốc nếu chưa chuyển vào public
            directoryPath = path.join(process.cwd(), 'assets', 'images');
        }

        const ext = req.query.ext ? req.query.ext.toLowerCase() : 'webp';

        // 2. Đọc file
        const files = await fs.promises.readdir(directoryPath);

        // 3. Lọc và Sắp xếp (Sort) quan trọng để ảnh không bị lộn xộn
        const imageUrls = files
            .filter(file => file.toLowerCase().endsWith('.' + ext))
            .sort((a, b) => {
                // Sắp xếp thông minh: file_1.webp sẽ đứng trước file_10.webp
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            })
            .map(file => `/assets/images/${file}`); // Dùng đường dẫn tương đối

        res.status(200).json({
            success: true,
            files: imageUrls,
        });

    } catch (error) {
        console.error("API Error:", error);
        // Trả về mảng rỗng để web không bị crash
        res.status(200).json({ success: false, files: [] });
    }
}