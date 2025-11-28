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
import { pool, request, HTTP_GET, HTTP_PATCH, HTTP_PUT, HTTP_POST } from '../../connection/request.js';

export const admin = (() => {

    // ĐỊNH NGHĨA SERVER URL 
    const SERVER_URL = "https://wedding-invitation-of-hau-and-chin.vercel.app";

    /**
     * @returns {Promise<void>}
     */
    const getUserStats = () => auth.getDetailUser(SERVER_URL).then((res) => { // Truyền URL vào auth

        // --- LOGIC HIỂN THỊ THÔNG TIN ADMIN (GIẢ LẬP) ---
        util.safeInnerHTML(document.getElementById('dashboard-name'), `Admin<i class="fa-solid fa-hands text-warning ms-2"></i>`);
        const currentToken = localStorage.getItem('admin_token');
        document.getElementById('dashboard-accesskey').value = currentToken;
        document.getElementById('dashboard-email').textContent = 'admin@wedding.app';
        //document.getElementById('button-copy-accesskey').setAttribute('data-copy', session.getToken());

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
        const oldPass = document.getElementById('old_password').value;
        const newPass = document.getElementById('new_password').value;

        if (!oldPass) return util.notify("Vui lòng nhập mật khẩu cũ").warning();
        if (!newPass) return util.notify("Vui lòng nhập mật khẩu mới").warning();

        if (!util.ask("Bạn có chắc chắn muốn đổi mật khẩu không?")) return; // Hộp thoại xác nhận

        const btn = util.disableButton(button);

        request(HTTP_PATCH, SERVER_URL + '/api/admin/settings')
            .token(session.getToken())
            .body({
                old_password: oldPass, // Gửi pass cũ
                admin_password: newPass // Gửi pass mới
            })
            .send()
            .then((res) => {
                if (res.code === 200 && res.data.result === 'success') {
                    util.notify("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.").success();
                    setTimeout(() => auth.clearSession(), 1500);
                } else {
                    // Hiển thị lỗi từ server (ví dụ: Mật khẩu cũ sai)
                    util.notify(res.data.message || "Đổi mật khẩu thất bại").error();
                }
            })
            .catch(() => util.notify("Lỗi kết nối").error())
            .finally(() => btn.restore());
    };

    // --- XỬ LÝ HIỂN THỊ TOKEN ---
    function toggleTokenVisibility() {
        const input = document.getElementById('dashboard-accesskey');
        const icon = document.getElementById('eye-icon');

        if (input.type === "password") {
            input.type = "text"; // Hiện chữ
            icon.className = "fa-solid fa-eye-slash";
        } else {
            input.type = "password"; // Hiện sao
            icon.className = "fa-solid fa-eye";
        }
    }

    function copyToken() {
        const token = document.getElementById('dashboard-accesskey').value;
        navigator.clipboard.writeText(token);
        util.notify("Đã copy Token!").success();
    }

    // --- XỬ LÝ REGENERATE ---
    async function regenerateToken() {
        if (!confirm("Tạo token mới sẽ làm phiên đăng nhập cũ hết hạn. Tiếp tục?")) return;

        const res = await fetch(SERVER_URL + '/api/admin/regenerate', {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('admin_token') }
        });

        if (res.status === 200) {
            const json = await res.json();
            // Cập nhật token mới vào Storage và Giao diện
            localStorage.setItem('admin_token', json.token);
            document.getElementById('dashboard-accesskey').value = json.token;
            util.notify("Token mới đã được tạo!").success();
        } else {
            util.notify("Phiên hết hạn, vui lòng đăng nhập lại.").error();
            setTimeout(() => logout(), 1000);
        }
    }
    /**
     * @returns {void}
     */
    const pageLoaded = () => {
        lang.init();
        offline.init();

        // KIỂM TRA TOKEN
        const token = session.getToken(); // Lấy từ localStorage

        if (session.isValid()) {
            // Nếu đã có token trong localStorage -> Vào thẳng Dashboard
            getUserStats();
        } else {
            // Nếu chưa có -> Xóa sạch session cũ và hiện Login
            auth.clearSession();
        }
    };

    /** @returns {object} */
    const init = () => {
        auth.init();
        theme.init();
        session.init();
        // ... (logic clear storage) ...

        // --- THÊM CÁC HÀM GLOBAL CHO DASHBOARD HTML GỌI ---

        // 1. Hàm Ẩn/Hiện Token
        window.toggleTokenVisibility = () => {
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

        // 2. Hàm Copy Token
        window.copyToken = () => {
            const token = document.getElementById('dashboard-accesskey').value;
            if (!token) return;
            navigator.clipboard.writeText(token);
            util.notify("Đã copy Token!").success();
        };

        // 3. Hàm Regenerate Token
        window.regenerateToken = async () => {
            if (!util.ask("Tạo token mới sẽ làm phiên đăng nhập cũ hết hạn. Tiếp tục?")) return;

            // Gọi API regenerate (Bạn cần tạo file api/admin/regenerate.js trước nhé)
            try {
                const res = await request(HTTP_POST, SERVER_URL + '/api/admin/regenerate')
                    .token(session.getToken())
                    .send();

                console.log("Regenerate Response:", res); // Debug xem nó trả về gì

                let newToken = res.data ? res.data.token : null;

                // Trường hợp 2: request trả về trực tiếp { token: ... } (hoặc res.token)
                if (!newToken && res.token) {
                    newToken = res.token;
                }

                // Trường hợp 3: res.result === 'success'
                if (newToken) {
                    session.setToken(newToken);
                    document.getElementById('dashboard-accesskey').value = newToken;
                    util.notify("Token mới đã tạo! Đang đăng xuất...").success();

                    // Xóa token cũ ở client
                    session.logout();

                    // Đợi 1.5s cho người dùng đọc thông báo rồi reload trang
                    setTimeout(() => {
                        location.reload(); // Trang sẽ tự động hiện form login vì không còn token
                    }, 1500);
                } else {
                    util.notify("Lỗi: Không nhận được token mới.").error();
                    // Chỉ logout nếu mã lỗi là 401
                    if (res.code === 401 || res.status === 401) {
                        setTimeout(() => auth.clearSession(), 1000);
                    }
                }
            } catch (e) {
                console.error(e);
                util.notify("Lỗi kết nối").error();
            }
        };

        // --- HÀM QUẢN LÝ SETTING (TAB 3) ---
        window.updateConfig = async (key, value) => {
            const body = {};
            body[key] = value;

            try {
                const res = await request(HTTP_PATCH, SERVER_URL + '/api/admin/settings')
                    .token(session.getToken())
                    .body(body)
                    .send();

                if (res.code === 200) util.notify("Đã lưu cài đặt").success();
                else util.notify("Lưu thất bại").error();
            } catch (e) {
                util.notify("Lỗi kết nối").error();
            }
        };

        // --- HÀM QUẢN LÝ LỜI CHÚC (TAB 2) ---

        /* 1. Load danh sách (Gọi khi bấm vào Tab Wishes hoặc load trang)
        const loadWishesManager = async () => {
            const container = document.getElementById('wishes-manager-list');
            if (!container) return;

            container.innerHTML = '<p class="text-center">Đang tải...</p>';

            const res = await request(HTTP_GET, SERVER_URL + '/api/wishes').token(session.getToken()).send();

            if (res.code === 200) {
                container.innerHTML = '';
                res.data.forEach(item => {
                    // Icon ngôi sao: Vàng nếu highlight, Xám nếu không
                    const starClass = item.is_highlight ? 'text-warning' : 'text-secondary';

                    const html = `
                <div class="bg-white p-3 rounded-3 shadow-sm border d-flex justify-content-between align-items-start" id="wish-row-${item.id}">
                    <div>
                        <h6 class="fw-bold mb-1">${util.escapeHtml(item.name)}</h6>
                        <p class="mb-1 text-muted small">${util.escapeHtml(item.message)}</p>
                        <span class="badge bg-light text-dark">${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-light btn-sm rounded-circle ${starClass}" 
                                onclick="undangan.admin.toggleHighlight('${item.id}', ${!item.is_highlight})" title="Nổi bật">
                            <i class="fa-solid fa-star"></i>
                        </button>
                        <button class="btn btn-light btn-sm rounded-circle text-primary" 
                                onclick="undangan.admin.openEditWish('${item.id}')" title="Sửa">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-light btn-sm rounded-circle text-danger" 
                                onclick="undangan.admin.deleteWish('${item.id}')" title="Xóa">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>`;
                    container.insertAdjacentHTML('beforeend', html);
                });
            }
        };*/

        // 2. Toggle Highlight (Ghim)
        window.toggleHighlight = async (id, newState) => {
            const res = await request(HTTP_PUT, SERVER_URL + `/api/wishes/${id}`)
                .token(session.getToken())
                .body({ is_highlight: newState })
                .send();

            if (res.code === 200) {
                loadWishesManager(); // Reload lại list
                util.notify(newState ? "Đã ghim lời chúc" : "Đã bỏ ghim").success();
            }
        };

        // 3. Mở Modal Sửa
        window.openEditWish = (id) => {
            // Tìm dữ liệu từ giao diện hiện tại để điền vào modal (hoặc gọi API lấy detail)
            const row = document.getElementById(`wish-row-${id}`);
            const name = row.querySelector('h6').innerText;
            const msg = row.querySelector('p').innerText;

            document.getElementById('edit-wish-id').value = id;
            document.getElementById('edit-wish-name').value = name;
            document.getElementById('edit-wish-msg').value = msg;

            bs.modal('editWishModal').show();
        };

        // 4. Lưu (Thêm mới hoặc Sửa)
        window.saveWish = async () => {
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
                    // --- TRƯỜNG HỢP SỬA (CÓ ID) ---
                    res = await request(HTTP_PUT, SERVER_URL + `/api/wishes/${id}`)
                        .token(session.getToken())
                        .body({ name: name, message: msg })
                        .send();
                } else {
                    // --- TRƯỜNG HỢP THÊM MỚI (KHÔNG CÓ ID) ---
                    // Gọi API POST giống như khách gửi
                    res = await request(HTTP_POST, SERVER_URL + '/api/wishes')
                        .body({ Ten: name, LoiChuc: msg, ThamDu: 'Admin thêm' }) // Dùng key giống form khách
                        .send();
                }

                if (res.code === 200) {
                    bs.modal('editWishModal').hide();
                    loadWishesManager(); // Tải lại danh sách để thấy thay đổi
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

        // 5. Thêm thủ công (Add)
        window.openAddWishModal = () => {
            // Tái sử dụng modal edit nhưng xóa trắng ID
            document.getElementById('edit-wish-id').value = ''; // Trống = Thêm mới
            document.getElementById('edit-wish-name').value = '';
            document.getElementById('edit-wish-msg').value = '';
            bs.modal('editWishModal').show();
        };

        window.addEventListener('load', () => pool.init(pageLoaded, ['gif']));

        // --- 1. CÁC HÀM HELPER UI ---
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

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
                    if (el) el.checked = !value;
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
                    if (countEl) countEl.textContent = parseInt(countEl.textContent.replace('.', '')) - 1;
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
                loadWishesManager,
                toggleHighlight,
                deleteWish,
                openEditWish,
                openAddWishModal,
                saveWish,
                toggleTokenVisibility,
                copyToken,
                regenerateToken,
                pageLoaded,
            },
        };
    };

    return { init };
})();