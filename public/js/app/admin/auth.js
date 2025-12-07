// File js/app/admin/auth.js
import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { dto } from '../../connection/dto.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { pool, cacheRequest, request, HTTP_GET, HTTP_STATUS_OK } from '../../connection/request.js';

// --- CẤU HÌNH URL SERVER (QUAN TRỌNG) ---
// Đảm bảo URL này không có dấu / ở cuối
const BASE_API_URL = "https://wedding-invitation-of-hau-and-chin.vercel.app";

export const auth = (() => {

    /** @type {ReturnType<typeof storage>|null} */
    let user = null;
    
    // --- HÀM XỬ LÝ ĐĂNG NHẬP (FIXED) ---
    const adminLoginHandler = async (button) => {
        const btn = util.disableButton(button);
        const formPassword = document.getElementById('admin-pass');

        if (!formPassword) {
            btn.restore();
            return;
        }

        formPassword.disabled = true;
        
        try {
            // Gọi hàm login
            const success = await session.login(
                { password: formPassword.value }, 
                BASE_API_URL + '/api/admin/login' // URL đầy đủ để tránh lỗi 404
            );
            
            if (success) {
                // --- CASE 2 FIX: ĐĂNG NHẬP THÀNH CÔNG ---
                util.notify("Đăng nhập thành công! Đang vào Dashboard...").success();
                
                // Thay vì cố đóng modal, ta reload trang để admin.js tự khởi tạo lại từ đầu
                // Đây là cách ổn định nhất.
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                // --- CASE 1 FIX: SAI MẬT KHẨU ---
                // Hiển thị thông báo lỗi rõ ràng cho người dùng
                util.notify("Mật khẩu không chính xác! Vui lòng thử lại.").error();
                // Rung lắc ô mật khẩu (tùy chọn visual effect)
                formPassword.classList.add('is-invalid');
                setTimeout(() => formPassword.classList.remove('is-invalid'), 2000);
            }
        } catch (e) {
            console.error("Login Error:", e);
            util.notify("Lỗi kết nối server: " + e.message).error();
        } finally {
            // Chỉ khôi phục nút nếu thất bại (nếu thành công thì trang sẽ reload)
            // Nhưng cứ restore để an toàn
            btn.restore();
            formPassword.disabled = false;
            formPassword.focus();
        }
    };
    // -----------------------------------------------------------------

    /** @returns {Promise<void>} */
    const clearSession = async () => {
        // await pool.restart(cacheRequest); // Có thể bỏ dòng này nếu không cần clear cache mạng
        
        // Gọi hàm logout đã sửa ở Bước 1 (xóa localStorage)
        session.logout(); 
        
        // Hiện lại Modal Login
        bs.modal('mainModal').show();
    };

    /** @returns {Promise<object>} */
    const getDetailUser = () => {
        // Sử dụng BASE_API_URL để đảm bảo request không bị lỗi đường dẫn
        return request(HTTP_GET, BASE_API_URL + '/api/config')
            .token(session.getToken())
            .send()
            .then((res) => {
                if (res.code !== HTTP_STATUS_OK) {
                    throw new Error('failed to get config.');
                }
                
                // Giả lập dữ liệu user
                user.set('name', 'Admin');
                user.set('email', 'admin@wedding.com');
                user.set('access_key', session.getToken()); 
                
                // Map config từ server vào storage
                if (res.data) {
                    Object.entries(res.data).forEach(([k, v]) => user.set(k, v));
                }
                
                return res;
            }).catch((err) => {
                // Nếu lỗi (ví dụ token hết hạn), tự động logout
                clearSession();
                throw err;
            });
    };

    /** @returns {ReturnType<typeof storage>|null} */
    const getUserStorage = () => user;

    /** @returns {void} */
    const init = () => {
        user = storage('user');
    };

    return {
        init,
        login: adminLoginHandler, 
        clearSession,
        getDetailUser,
        getUserStorage,
    };
})();