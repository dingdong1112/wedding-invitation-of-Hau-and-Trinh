// api/utils.js
export const generateToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

// Hàm kiểm tra Token có hợp lệ không (đúng chuỗi và chưa hết hạn)
export const isValidToken = (tokenFromClient, tokenInDb, expiryInDb) => {
    if (!tokenInDb || tokenFromClient !== tokenInDb) return false;
    const now = Date.now();
    return now < expiryInDb; // Còn hạn
};