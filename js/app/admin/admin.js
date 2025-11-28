import { auth } from './auth.js';
import { navbar } from './navbar.js';
import { util } from '../../common/util.js';
import { dto } from '../../connection/dto.js';
import { theme } from '../../common/theme.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { offline } from '../../common/offline.js';
import { comment } from '../components/comment.js';
import { pool, request, HTTP_GET, HTTP_PATCH, HTTP_PUT } from '../../connection/request.js';

export const admin = (() => {

    // ĐỊNH NGHĨA SERVER URL 
    const SERVER_URL = "https://wedding-invitation-of-hau-and-chin.vercel.app";

    /**
     * @returns {Promise<void>}
     */
    const getUserStats = () => auth.getDetailUser(SERVER_URL).then((res) => { // Truyền URL vào auth

        // --- LOGIC HIỂN THỊ THÔNG TIN ADMIN (GIẢ LẬP) ---
        util.safeInnerHTML(document.getElementById('dashboard-name'), `Admin<i class="fa-solid fa-hands text-warning ms-2"></i>`);
        document.getElementById('dashboard-email').textContent = 'admin@wedding.app';
        document.getElementById('dashboard-accesskey').value = session.getToken();
        document.getElementById('button-copy-accesskey').setAttribute('data-copy', session.getToken());

        const configStorage = storage('config');
        document.getElementById('form-name').value = 'Admin'; // Tên mặc định

        // Load config
        document.getElementById('confettiAnimation').checked = configStorage.get('confetti_enabled');
        document.getElementById('deleteComment').checked = configStorage.get('can_delete');

        // Vô hiệu hóa các trường không dùng đến
        document.getElementById('filterBadWord')?.closest('.form-check')?.remove();
        document.getElementById('replyComment')?.closest('.form-check')?.remove();
        document.getElementById('editComment')?.closest('.form-check')?.remove();
        document.getElementById('form-timezone')?.closest('.p-3')?.remove();
        document.getElementById('dashboard-tenorkey')?.closest('.p-3')?.remove();

        document.dispatchEvent(new Event('undangan.session'));

        // Tải thống kê (GỌI ĐÚNG API MỚI)
        request(HTTP_GET, SERVER_URL + '/api/wishes')
            .token(session.getToken())
            .withCache(1000 * 30)
            .send()
            .then((resp) => {
                const comments = resp.data.length;
                let present = resp.data.filter(i => i.presence === 'Có').length;
                let absent = resp.data.filter(i => i.presence === 'Không').length;

                document.getElementById('count-comment').textContent = String(comments).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                document.getElementById('count-present').textContent = String(present).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                document.getElementById('count-absent').textContent = String(absent).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                document.getElementById('count-like').textContent = '0'; // Giả lập

                // Khởi tạo hiển thị lời chúc (cần viết lại comment.js sau)
                // comment.show(); // Tạm thời comment nếu chưa sửa comment.js Admin
            });

        // comment.show();
    }).catch(err => {
        // Nếu get user thất bại (token hết hạn), nó sẽ bị chuyển hướng login
        console.error("User stats failed, redirecting to login:", err);
    });

    /**
     * @param {HTMLElement} checkbox
     * @param {string} type
     * @returns {void}
     */
    const changeCheckboxValue = (checkbox, type) => {
        const label = util.disableCheckbox(checkbox);

        const fieldMap = {
            'confettiAnimation': 'confetti_enabled',
            'deleteComment': 'can_delete',
            'replyComment': 'can_reply',
            'editComment': 'can_edit',
            'filterBadWord': 'is_filter'
        };
        const mongoField = fieldMap[checkbox.id] || type;
        const body = {};
        body[mongoField] = checkbox.checked;

        request(HTTP_PATCH, SERVER_URL + '/api/admin/settings') // Gửi URL đầy đủ
            .token(session.getToken())
            .body(body)
            .send()
            .then((res) => {
                if (res.code === 200) {
                    storage('config').set(mongoField, checkbox.checked);
                    util.notify("Lưu cấu hình thành công").success();
                } else {
                    util.notify("Lỗi lưu cấu hình").error();
                    checkbox.checked = !checkbox.checked; // Revert nếu lỗi
                }
            })
            .catch(() => {
                util.notify("Lỗi mạng").error();
                checkbox.checked = !checkbox.checked;
            })
            .finally(() => label.restore());
    };

    // Vô hiệu hóa các hàm không dùng đến
    const tenor = () => util.notify("Tính năng không được hỗ trợ.").warning();
    const regenerate = () => util.notify("Tính năng không được hỗ trợ.").warning();
    const changeName = () => util.notify("Đổi tên trong Cấu hình Server.").warning();
    const download = () => util.notify("Vui lòng tải thủ công từ MongoDB Atlas.").warning();
    const openLists = () => { };
    const changeTz = () => util.notify("Tính năng không được hỗ trợ.").warning();

    /**
     * @returns {void}
     */
    const enableButtonName = () => {
        const btn = document.getElementById('button-change-name');
        if (btn.disabled) {
            btn.disabled = false;
        }
    };

    /**
     * @returns {void}
     */
    const enableButtonPassword = () => {
        const btn = document.getElementById('button-change-password');
        const old = document.getElementById('old_password');

        if (btn.disabled && old.value.length !== 0) {
            btn.disabled = false;
        }
    };

    const logout = () => {
        if (util.ask("Bạn muốn đăng xuất?")) {
            auth.clearSession();
        }
    };

    const changePassword = (button) => {
        const newPass = document.getElementById('new_password').value;
        if (!newPass) return util.notify("Nhập mật khẩu mới").warning();

        const btn = util.disableButton(button);

        request(HTTP_PATCH, SERVER_URL + '/api/admin/settings')
            .token(session.getToken())
            .body({ admin_password: newPass })
            .send()
            .then((res) => {
                if (res.code === 200) {
                    util.notify("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.").success();
                    setTimeout(() => auth.clearSession(), 1500);
                }
            })
            .finally(() => btn.restore());
    };

    /**
     * @returns {void}
     */
    const pageLoaded = () => {
        lang.init();
        // Cần thiết lập SERVER_URL để các module khác biết gọi đến đâu
        document.body.setAttribute('data-url', SERVER_URL);

        document.addEventListener('undangan.admin.success', getUserStats);
        document.addEventListener('hidden.bs.modal', getUserStats);

        // ... (các bước init khác giữ nguyên)

        const raw = window.location.hash.slice(1);
        if (raw.length > 0) {
            session.setToken(raw);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        session.isValid() ? getUserStats() : auth.clearSession();
    };

    /** @returns {object} */
    const init = () => {
        auth.init();
        theme.init();
        session.init();
        // ... (logic clear storage) ...

        window.addEventListener('load', () => pool.init(pageLoaded, ['gif']));

        return {
            util,
            theme,
            comment,
            admin: {
                auth,
                navbar,
                logout,
                tenor,
                download,
                regenerate,
                changeName,
                changePassword,
                changeCheckboxValue,
                enableButtonName,
                enableButtonPassword,
                openLists,
                changeTz,
            },
        };
    };

    return { init };
})();