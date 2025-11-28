// File js/app/admin/admin.js
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
import { pool, request, HTTP_GET, HTTP_PATCH, HTTP_PUT, HTTP_POST, HTTP_DELETE } from '../../connection/request.js';

export const admin = (() => {

    const SERVER_URL = "https://wedding-invitation-of-hau-and-chin.vercel.app";

    // --- 1. CÁC HÀM HELPER UI ---
    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = !!val; };

    // --- 2. ĐỊNH NGHĨA CÁC HÀM LOGIC TRƯỚC (Để tránh lỗi chưa khai báo) ---

    // Hàm: Load danh sách lời chúc
    const loadWishesManager = async () => {
        const container = document.getElementById('wishes-manager-list');
        if (!container) return;

        container.innerHTML = '<p class="text-center text-muted py-3"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách...</p>';

        try {
            const res = await request(HTTP_GET, SERVER_URL + '/api/wishes').token(session.getToken()).send();

            if (res.code === 200) {
                container.innerHTML = '';
                if (res.data.length === 0) {
                    container.innerHTML = '<p class="text-center text-muted">Chưa có lời chúc nào.</p>';
                    return;
                }

                res.data.forEach(item => {
                    const id = item.id || item._id;
                    const starClass = item.is_highlight ? 'text-warning' : 'text-secondary';
                    const presenceBadge = item.presence ?
                        '<span class="badge bg-success-subtle text-success rounded-pill me-1"><i class="fa-solid fa-check"></i> Tham dự</span>' :
                        '<span class="badge bg-danger-subtle text-danger rounded-pill me-1"><i class="fa-solid fa-xmark"></i> Vắng</span>';

                    // Lưu ý: Gọi window.toggleHighlight để chắc chắn HTML gọi được
                    const html = `
                    <div class="bg-white p-3 rounded-4 shadow-sm border mb-0 d-flex flex-column flex-sm-row justify-content-between gap-3" id="wish-row-${id}">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                <h6 class="fw-bold mb-0 me-2">${util.escapeHtml(item.name)}</h6>
                                ${presenceBadge}
                                <small class="text-muted" style="font-size: 0.75rem;">${new Date(item.created_at).toLocaleString()}</small>
                            </div>
                            <p class="mb-0 text-secondary" style="font-size: 0.9rem; white-space: pre-wrap;">${util.escapeHtml(item.message)}</p>
                        </div>
                        <div class="d-flex align-items-start gap-2 flex-shrink-0">
                            <button class="btn btn-light btn-sm rounded-circle ${starClass} shadow-sm" 
                                    onclick="window.toggleHighlight('${id}', ${!item.is_highlight})" title="Ghim/Bỏ ghim">
                                <i class="fa-solid fa-star"></i>
                            </button>
                            <button class="btn btn-light btn-sm rounded-circle text-primary shadow-sm" 
                                    onclick="window.openEditWish('${id}')" title="Sửa">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-light btn-sm rounded-circle text-danger shadow-sm" 
                                    onclick="window.deleteWish('${id}')" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>`;
                    container.insertAdjacentHTML('beforeend', html);
                });
            }
        } catch (e) {
            container.innerHTML = '<p class="text-center text-danger">Lỗi tải dữ liệu.</p>';
        }
    };

    // Hàm: Tải thống kê (Gọi loadWishesManager bên trong)
    const getUserStats = () => auth.getDetailUser(SERVER_URL).then((res) => {
        util.safeInnerHTML(document.getElementById('dashboard-name'), `Admin<i class="fa-solid fa-hands text-warning ms-2"></i>`);
        const currentToken = localStorage.getItem('admin_token');
        setVal('dashboard-accesskey', currentToken);
        setText('dashboard-email', 'admin@wedding.app');
        setVal('form-name', 'Admin');

        const configStorage = storage('config');
        setCheck('toggle-confetti', configStorage.get('confetti_enabled'));
        setCheck('toggle-particles', configStorage.get('particle_control_enabled'));
        setCheck('toggle-vinyl', configStorage.get('vinyl_enabled'));
        setCheck('toggle-music', configStorage.get('music_enabled'));
        setCheck('toggle-popup', configStorage.get('wishes_popup_enabled'));
        setCheck('toggle-lock', configStorage.get('can_delete'));

        // Xóa phần tử thừa
        document.getElementById('filterBadWord')?.closest('.form-check')?.remove();
        document.getElementById('replyComment')?.closest('.form-check')?.remove();
        document.getElementById('editComment')?.closest('.form-check')?.remove();
        document.getElementById('form-timezone')?.closest('.p-3')?.remove();
        document.getElementById('dashboard-tenorkey')?.closest('.p-3')?.remove();

        document.dispatchEvent(new Event('undangan.session'));

        // Load dữ liệu thống kê
        request(HTTP_GET, SERVER_URL + '/api/wishes')
            .token(session.getToken())
            .withCache(1000 * 30)
            .send()
            .then((resp) => {
                const comments = resp.data.length;
                let present = resp.data.filter(i => i.presence === true || i.presence == 1 || i.presence === 'Có').length;
                let absent = resp.data.filter(i => i.presence === false || i.presence == 2 || i.presence === 'Không').length;

                setText('count-comment', String(comments).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-present', String(present).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-absent', String(absent).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-like', '0');

                // QUAN TRỌNG: Gọi hàm load list sau khi đã có dữ liệu
                loadWishesManager();
            });

    }).catch(err => {
        console.error("User stats failed:", err);
    });

    // --- 3. CÁC HÀM HÀNH ĐỘNG (ACTIONS) ---

    const updateConfig = async (key, value) => {
        const body = {};
        body[key] = value;
        try {
            const res = await request(HTTP_PATCH, SERVER_URL + '/api/admin/settings')
                .token(session.getToken())
                .body(body)
                .send();
            
            if (res.code === 200) {
                storage('config').set(key, value);
                util.notify("Đã lưu cài đặt").success();
            } else {
                util.notify("Lưu thất bại").error();
                // Revert UI
                const el = document.getElementById(`toggle-${key.replace('_enabled', '').replace('can_', '')}`); // Hacky way to revert
                if(el) el.checked = !value;
            }
        } catch (e) {
            util.notify("Lỗi kết nối").error();
        }
    };

    const toggleHighlight = async (id, newState) => {
        try {
            const res = await request(HTTP_PUT, SERVER_URL + `/api/wishes/${id}`)
                .token(session.getToken())
                .body({ is_highlight: newState })
                .send();
            if (res.code === 200) {
                util.notify(newState ? "Đã ghim" : "Đã bỏ ghim").success();
                loadWishesManager();
            }
        } catch (e) { util.notify("Lỗi").error(); }
    };

    const deleteWish = async (id) => {
        if (!util.ask("Bạn chắc chắn muốn xóa vĩnh viễn?")) return;
        try {
            const res = await request(HTTP_DELETE, SERVER_URL + `/api/wishes/${id}`)
                .token(session.getToken())
                .send();
            if (res.code === 200) {
                const row = document.getElementById(`wish-row-${id}`);
                if (row) row.remove();
                util.notify("Đã xóa").success();
                
                // Giảm số lượng
                const countEl = document.getElementById('count-comment');
                if(countEl) countEl.textContent = parseInt(countEl.textContent.replace('.', '')) - 1;
            }
        } catch (e) { util.notify("Lỗi xóa").error(); }
    };

    const openEditWish = (id) => {
        const row = document.getElementById(`wish-row-${id}`);
        const name = row.querySelector('h6').innerText;
        const msg = row.querySelector('p').innerText;
        setVal('edit-wish-id', id);
        setVal('edit-wish-name', name);
        setVal('edit-wish-msg', msg);
        // @ts-ignore
        const modal = new bootstrap.Modal(document.getElementById('editWishModal'));
        modal.show();
    };

    const openAddWishModal = () => {
        setVal('edit-wish-id', '');
        setVal('edit-wish-name', '');
        setVal('edit-wish-msg', '');
        // @ts-ignore
        const modal = new bootstrap.Modal(document.getElementById('editWishModal'));
        modal.show();
    };

    const saveWish = async () => {
        const id = document.getElementById('edit-wish-id').value;
        const name = document.getElementById('edit-wish-name').value;
        const msg = document.getElementById('edit-wish-msg').value;

        if (!name || !msg) {
            util.notify("Vui lòng nhập tên và lời chúc").warning();
            return;
        }

        const btn = document.querySelector('#editWishModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

        let res;
        try {
            if (id) {
                res = await request(HTTP_PUT, SERVER_URL + `/api/wishes/${id}`)
                    .token(session.getToken())
                    .body({ name: name, message: msg })
                    .send();
            } else {
                res = await request(HTTP_POST, SERVER_URL + '/api/wishes')
                    .body({ Ten: name, LoiChuc: msg, ThamDu: 'Admin thêm' })
                    .send();
            }

            if (res.code === 200) {
                // @ts-ignore
                const modalEl = document.getElementById('editWishModal');
                // @ts-ignore
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();
                
                loadWishesManager();
                util.notify(id ? "Đã cập nhật thành công" : "Đã thêm lời chúc mới").success();
            } else {
                util.notify("Lỗi khi lưu").error();
            }
        } catch (e) {
            util.notify("Lỗi kết nối").error();
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    const changePassword = (button) => {
        const oldPass = document.getElementById('old_password').value;
        const newPass = document.getElementById('new_password').value;
        if (!oldPass) return util.notify("Vui lòng nhập mật khẩu cũ").warning();
        if (!newPass) return util.notify("Vui lòng nhập mật khẩu mới").warning();
        if (!util.ask("Bạn có chắc chắn muốn đổi mật khẩu không?")) return;

        const btn = util.disableButton(button);
        request(HTTP_PATCH, SERVER_URL + '/api/admin/settings')
            .token(session.getToken())
            .body({ old_password: oldPass, admin_password: newPass })
            .send()
            .then((res) => {
                if (res.code === 200 && res.data.result === 'success') {
                    util.notify("Đổi mật khẩu thành công. Đăng nhập lại.").success();
                    setTimeout(() => auth.clearSession(), 1500);
                } else {
                    util.notify(res.data.message || "Đổi mật khẩu thất bại").error();
                }
            })
            .catch(() => util.notify("Lỗi kết nối").error())
            .finally(() => btn.restore());
    };

    const logout = () => {
        if (util.ask("Bạn muốn đăng xuất?")) auth.clearSession();
    };

    // --- 4. TOKEN UTILS ---
    const toggleTokenVisibility = () => {
        const input = document.getElementById('dashboard-accesskey');
        const icon = document.getElementById('eye-icon');
        if (input.type === "password") {
            input.type = "text";
            icon.className = "fa-solid fa-eye-slash";
        } else {
            input.type = "password";
            icon.className = "fa-solid fa-eye";
        }
    };

    const copyToken = () => {
        const token = document.getElementById('dashboard-accesskey').value;
        if (!token) return;
        navigator.clipboard.writeText(token);
        util.notify("Đã copy Token!").success();
    };

    const regenerateToken = async () => {
        if (!util.ask("Tạo token mới sẽ làm phiên đăng nhập cũ hết hạn. Tiếp tục?")) return;
        try {
            const res = await request(HTTP_POST, SERVER_URL + '/api/admin/regenerate')
                .token(session.getToken())
                .send();

            // Xử lý các kiểu trả về của request
            let newToken = res.data ? res.data.token : (res.token ? res.token : null);

            if (newToken) {
                session.setToken(newToken);
                setVal('dashboard-accesskey', newToken);
                util.notify("Token mới đã tạo! Đang đăng xuất...").success();
                session.logout();
                setTimeout(() => location.reload(), 1500);
            } else {
                util.notify("Lỗi: Không nhận được token mới.").error();
            }
        } catch (e) {
            util.notify("Lỗi kết nối").error();
        }
    };

    // --- 5. PAGE LOAD & INIT ---
    const pageLoaded = () => {
        lang.init();
        offline.init();
        document.body.setAttribute('data-url', SERVER_URL);

        // --- QUAN TRỌNG: GẮN HÀM VÀO WINDOW ĐỂ HTML GỌI ĐƯỢC ---
        window.updateConfig = updateConfig;
        window.loadWishesManager = loadWishesManager;
        window.toggleHighlight = toggleHighlight;
        window.deleteWish = deleteWish;
        window.openEditWish = openEditWish;
        window.openAddWishModal = openAddWishModal;
        window.saveWish = saveWish;
        window.toggleTokenVisibility = toggleTokenVisibility;
        window.copyToken = copyToken;
        window.regenerateToken = regenerateToken;
        // -------------------------------------------------------

        document.addEventListener('undangan.admin.success', getUserStats);

        const wishTabBtn = document.querySelector('[data-bs-target="#pills-wishes"]');
        if (wishTabBtn) wishTabBtn.addEventListener('shown.bs.tab', loadWishesManager);

        const raw = window.location.hash.slice(1);
        if (raw.length > 0) {
            session.setToken(raw);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (session.isValid()) {
            getUserStats();
        } else {
            auth.clearSession();
        }
    };

    const init = () => {
        auth.init();
        theme.init();
        session.init();
        window.addEventListener('load', () => pool.init(pageLoaded, ['gif']));

        return {
            util, theme, comment,
            admin: {
                auth, navbar, logout,
                // Hàm cũ dummy
                tenor:()=>{}, download:()=>{}, regenerate:()=>{}, 
                changeName:()=>{}, changePassword:changePassword, // Dùng hàm mới
                changeCheckboxValue:()=>{}, openLists:()=>{}, changeTz:()=>{}
            },
        };
    };

    return { init };
})();