// File js/app/admin/auth.js
import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { dto } from '../../connection/dto.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { pool, cacheRequest, request, HTTP_POST, HTTP_STATUS_OK } from '../../connection/request.js';

const BASE_API_URL = 'https://wedding-invitation-of-hau-and-chin.vercel.app';

export const auth = (() => {

    /** @type {ReturnType<typeof storage>|null} */
    let user = null;

    // --- KHAI BÁO HÀM MỚI ĐỂ XỬ LÝ ĐĂNG NHẬP (GỌI TỪ HTML) ---
    const adminLoginHandler = async (button) => {
        const btn = util.disableButton(button);
        const formPassword = document.getElementById('admin-pass');

        // Đảm bảo nút được lấy đúng
        if (!formPassword) {
            btn.restore();
            util.notify("Lỗi: Không tìm thấy trường mật khẩu.").error();
            return;
        }

        formPassword.disabled = true;

        // GỌI HÀM LOGIN ĐÃ CẬP NHẬT
        // API MỚI: /api/admin/login, chỉ gửi password
        try {
            // SỬ DỤNG AWAIT để nhận thẳng kết quả, tránh lỗi 'then'
            const success = await session.login(
                { password: formPassword.value },
                BASE_API_URL + '/api/admin/login'
            );

            if (success) {
                formPassword.value = null;
                bs.modal('mainModal').hide();

                // --- THÔNG BÁO THÀNH CÔNG CHO ADMIN.JS ---
                // Kích hoạt một sự kiện tùy chỉnh (custom event)
                document.dispatchEvent(new Event('undangan.admin.success'));
            }
        } catch (e) {
            // Xử lý lỗi Network hoặc lỗi khác (lỗi này đã được xử lý trong request.js)
            // Nếu e là lỗi, request.js đã hiện alert, nên ta chỉ cần console log.
            console.error("Login failed:", e);
        } finally {
            btn.restore();
        formPassword.disabled = false;
        }
    };
    // -----------------------------------------------------------------

    /** @returns {Promise<void>} */
    const clearSession = async () => {
        await pool.restart(cacheRequest);
        user.clear();
        session.logout();
        bs.modal('mainModal').show();
    };

    /** @returns {Promise<object>} */
    const getDetailUser = () => {
        // API này sẽ gọi API lấy Config của bạn (vì API /api/user cũ đã chết)
        return request(HTTP_GET, '/api/config').token(session.getToken()).send().then((res) => {
            if (res.code !== HTTP_STATUS_OK) {
                throw new Error('failed to get config.');
            }

            // Giả lập dữ liệu user để code Admin cũ không crash
            user.set('name', 'Admin');
            user.set('email', 'admin@local.com');
            user.set('access_key', session.getToken());
            // Cần set thêm các config khác nếu admin.js muốn dùng
            Object.entries(res.data).forEach(([k, v]) => user.set(k, v));

            return res;
        }).catch((err) => {
            clearSession();
            return err;
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
        login: adminLoginHandler, // Đổi tên hàm export để khớp với HTML
        clearSession,
        getDetailUser,
        getUserStorage,
    };
})();