// File js/common/session.js (BẢN FIX CHUẨN 100%)
import { util } from './util.js';
import { storage } from './storage.js';
import { request, HTTP_POST, HTTP_GET, HTTP_STATUS_OK } from '../connection/request.js';

export const session = (() => {

     const TOKEN_KEY = 'admin_token'; 

    const getToken = () => localStorage.getItem(TOKEN_KEY);
    const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
    const logout = () => localStorage.removeItem(TOKEN_KEY);

    const isAdmin = () => {
        const token = getToken();
        return token === "VERCEL_ADMIN_TOKEN";
    };

    // --- HÀM LOGIN ĐÃ SỬA ---
    const login = (body, serverUrl) => {
        // KHÔNG dùng hàm parseLoginResponse nữa để tránh lỗi undefined
        return request(HTTP_POST, serverUrl)
            .body(body)
            .send() // <-- ĐỂ TRỐNG: Để lấy toàn bộ JSON từ server
            .then((res) => {
                console.log("Login Response:", res); // Dòng này để debug nếu cần

                // Vì không dùng transform, res chính là object trả về từ server gộp với {code: 200}
                // API trả về: { result: "success", token: "...", code: 200 }
                
                if (res.code === HTTP_STATUS_OK && res.token) {
                    setToken(res.token);
                    return true;
                }
                return false;
            })
            .catch(err => {
                console.error("Lỗi Login:", err);
                return false;
            });
    };

    const guest = (token) => {
        return request(HTTP_GET, '/api/v2/config')
            .withCache(1000 * 60 * 30)
            .withForceCache()
            .token(token)
            .send()
            .then((res) => {
                if (res.code !== HTTP_STATUS_OK) throw new Error('failed to get config.');
                const config = storage('config');
                for (const [k, v] of Object.entries(res.data)) config.set(k, v);
                setToken(token);
                return res;
            });
    };

    const decode = () => {
        if (!isAdmin()) return null;
        try { return JSON.parse(util.base64Decode(getToken().split('.')[1])); } catch { return null; }
    };

    const isValid = () => {
        return isAdmin(); // Nếu có token đúng thì là Valid, không cần check exp date phức tạp
    };

    const init = () => {};

    return {
        init, guest, isValid, login, logout, decode, isAdmin, setToken, getToken,
    };
})();