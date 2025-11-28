// File js/common/session.js
import { util } from './util.js';
import { storage } from './storage.js';
// import { dto } from '../connection/dto.js'; // <-- QUAN TRỌNG: BỎ DÒNG NÀY ĐI
import { request, HTTP_POST, HTTP_GET, HTTP_STATUS_OK } from '../connection/request.js';

export const session = (() => {

    let ses = null;

    const getToken = () => ses.get('token');
    const setToken = (token) => ses.set('token', token);

    // --- HÀM XỬ LÝ RESPONSE (Định nghĩa tại chỗ) ---
    // Hàm này sẽ đọc JSON trả về từ API login mới
    const parseLoginResponse = (data) => {
        // API trả về: { result: "success", token: "..." }
        if (data && data.result === 'success' && data.token) {
            return { token: data.token };
        }
        return { token: null };
    };

    /**
     * @param {object} body
     * @param {string} serverUrl
     * @returns {Promise<boolean>}
     */
    const login = (body, serverUrl = '/api/session') => {
        return request(HTTP_POST, serverUrl)
            .body(body)
            // Dùng hàm parseLoginResponse thay vì dto.tokenResponse
            .send(parseLoginResponse) 
            .then((res) => {
                // Kiểm tra cả mã HTTP 200 và có token hợp lệ
                if (res.code === HTTP_STATUS_OK && res.data && res.data.token) {
                    setToken(res.data.token);
                    return true; // Trả về TRUE -> auth.js sẽ reload trang
                }
                return false; // Trả về FALSE -> auth.js báo sai pass
            })
            .catch(err => {
                console.error("Session Login Error:", err);
                return false;
            });
    };

    const logout = () => ses.unset('token');

    const isAdmin = () => {
        const token = getToken();
        if (!token) return false;
        if (token === "VERCEL_ADMIN_TOKEN") return true;
        return token.split('.').length === 3;
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
        if (!isAdmin()) return false;
        // Token cứng luôn valid, token JWT check exp
        if (getToken() === "VERCEL_ADMIN_TOKEN") return true;
        return (decode()?.exp ?? 0) > (Date.now() / 1000);
    };

    const init = () => {
        ses = storage('session');
    };

    return {
        init, guest, isValid, login, logout, decode, isAdmin, setToken, getToken,
    };
})();