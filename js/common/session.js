// File js/common/session.js (BẢN FIX CHUẨN 100%)
import { util } from './util.js';
import { storage } from './storage.js';
import { request, HTTP_POST, HTTP_GET, HTTP_STATUS_OK } from '../connection/request.js';

export const session = (() => {

    // Dùng localStorage để lưu token vĩnh viễn
    const TOKEN_KEY = 'admin_token'; 

    const getToken = () => localStorage.getItem(TOKEN_KEY);
    const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
    const logout = () => localStorage.removeItem(TOKEN_KEY);

    const isAdmin = () => {
        const token = getToken();
        // Chỉ cần có token (khác null/empty) là coi như Admin ở phía Client
        // Việc token đúng hay sai sẽ do API Backend quyết định khi gửi request
        return !!token && token.length > 0;
    };

    const isValid = () => {
        return isAdmin();
    };
    // --------------------------------

    // --- HÀM LOGIN ĐÃ SỬA ---
     const login = (body, serverUrl) => {
        return request(HTTP_POST, serverUrl)
            .body(body)
            .send() 
            .then((res) => {
                // API trả về: { result: "success", token: "..." }
                if (res.code === HTTP_STATUS_OK && res.data && res.data.token) {
                    setToken(res.data.token);
                    return true;
                }
                return false;
            })
            .catch(err => {
                console.error("Lỗi Login:", err);
                return false;
            });
    };

     const guest = (token) => Promise.resolve(); 

    const decode = () => {
        if (!isAdmin()) return null;
        try { return JSON.parse(util.base64Decode(getToken().split('.')[1])); } catch { return null; }
    };

    const init = () => {};

    return {
        init, guest, isValid, login, logout, decode, isAdmin, setToken, getToken,
    };
})();