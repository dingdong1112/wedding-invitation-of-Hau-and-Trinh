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

const adminModule = () => {

    // ĐỊNH NGHĨA SERVER URL 
    const SERVER_URL = "https://wedding-invitation-of-hau-and-chin.vercel.app";

    /*
     * @returns {Promise<void>}
     *
    const getUserStats = () => auth.getDetailUser(SERVER_URL).then((res) => {

        // --- LOGIC HIỂN THỊ THÔNG TIN ADMIN ---
        util.safeInnerHTML(document.getElementById('dashboard-name'), `Admin<i class="fa-solid fa-hands text-warning ms-2"></i>`);
        const currentToken = localStorage.getItem('admin_token');

        // Kiểm tra element tồn tại trước khi gán để tránh lỗi null
        const accessKeyEl = document.getElementById('dashboard-accesskey');
        if (accessKeyEl) accessKeyEl.value = currentToken;

        const emailEl = document.getElementById('dashboard-email');
        if (emailEl) emailEl.textContent = 'admin@wedding.app';

        const configStorage = storage('config');
        const formNameEl = document.getElementById('form-name');
        if (formNameEl) formNameEl.value = 'Admin';

        // Load config UI
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        setCheck('confettiAnimation', configStorage.get('confetti_enabled'));
        setCheck('deleteComment', configStorage.get('can_delete'));

        // Xóa các phần tử thừa (Giữ nguyên logic của bạn)
        ['filterBadWord', 'replyComment', 'editComment', 'form-timezone', 'dashboard-tenorkey'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const parent = el.closest('.form-check') || el.closest('.p-3') || el.parentElement;
                if (parent) parent.remove(); else el.remove();
            }
        });

        document.dispatchEvent(new Event('undangan.session'));

        // --- QUAN TRỌNG: Tải thống kê & Vẽ biểu đồ (GỘP LÀM 1 REQUEST DUY NHẤT) ---
        request(HTTP_GET, SERVER_URL + '/api/wishes')
            .token(session.getToken())
            .withCache(1000 * 30)
            .send()
            .then((resp) => {
                const allWishes = resp.data;

                // 1. Tính toán số liệu
                const comments = allWishes.length;
                let present = allWishes.filter(i => ['Có', '1', 'true', true, 1].includes(i.presence)).length;
                let absent = allWishes.filter(i => ['Không', '0', 'false', false, 0].includes(i.presence)).length;
                let unknown = comments - present - absent;

                // 2. Cập nhật số liệu lên giao diện
                const setText = (id, val) => { if (document.getElementById(id)) document.getElementById(id).textContent = val; };
                setText('count-comment', String(comments).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-present', String(present).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-absent', String(absent).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                setText('count-like', '0');

                // 3. VẼ BIỂU ĐỒ (Dùng hàm tự tải thư viện)
                loadChartJsAndRender(present, absent, unknown, allWishes);

                // 4. Hiển thị bảng tin mới nhất
                renderLatestWishes(allWishes);

                // 5. Load danh sách quản lý (nếu cần)
                if (typeof loadWishesManager === 'function') loadWishesManager();
            });

    }).catch(err => {
        console.error("User stats failed:", err);
        // auth.clearSession(); // Uncomment dòng này nếu muốn tự động logout khi lỗi
    });*/


    // --- CÁC HÀM HỖ TRỢ VẼ BIỂU ĐỒ (Thêm vào bên dưới getUserStats) ---




    /**
     * @param {HTMLElement} checkbox
     * @param {string} type
     * @returns {void}
     */
    const changeCheckboxValue = (checkbox, type) => {
        const label = util.disableCheckbox(checkbox);

        const fieldMap = {
            'toggle-confetti': 'confetti_enabled',
            'toggle-particles': 'particle_control_enabled',
            'toggle-popup': 'wishes_popup_enabled',
            'toggle-lock': 'can_delete',
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

        // --- BIẾN TOÀN CỤC CHO PHÂN TRANG ---
        let allWishesData = []; // Lưu toàn bộ dữ liệu
        let filteredData = []; // Mới: Lưu dữ liệu sau khi lọc
        let currentPage = 1;
        let itemsPerPage = 10;

        // --- HÀM UI: ẨN HIỆN BỘ LỌC THỜI GIAN ---
        const toggleTimeFilter = () => {
            const type = document.getElementById('time-filter-type').value;
            const monthGroup = document.getElementById('filter-month-group');
            const rangeGroup = document.getElementById('filter-range-group');

            // Reset giá trị
            if (type !== 'month') {
                document.getElementById('filter-month-val').value = '';
                // document.getElementById('filter-year-val').value = '2025'; // Giữ năm mặc định
            }
            if (type !== 'range') {
                document.getElementById('filter-date-start').value = '';
                document.getElementById('filter-date-end').value = '';
            }

            // Ẩn hiện (dùng class d-none của Bootstrap)
            if (type === 'month') {
                monthGroup.classList.remove('d-none');
                rangeGroup.classList.add('d-none');
            } else if (type === 'range') {
                monthGroup.classList.add('d-none');
                rangeGroup.classList.remove('d-none');
            } else {
                monthGroup.classList.add('d-none');
                rangeGroup.classList.add('d-none');
                applyFilters();
            }
        };

        // --- HÀM LỌC DỮ LIỆU ---
        // --- HÀM LỌC DỮ LIỆU (SAFE VERSION) ---
        const applyFilters = () => {
            // Helper lấy giá trị an toàn (tránh lỗi null)
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };

            const statusFilter = getVal('filter-presence');
            const searchFilter = getVal('filter-search').toLowerCase();
            const timeType = getVal('time-filter-type');

            // Lấy giá trị thời gian
            const monthVal = getVal('filter-month-val');
            const yearVal = getVal('filter-year-val');
            const startVal = getVal('filter-date-start');
            const endVal = getVal('filter-date-end');

            filteredData = allWishesData.filter(item => {
                const itemDate = new Date(item.created_at);

                // 1. Lọc Trạng thái
                const p = String(item.presence).toLowerCase();
                let matchStatus = true;
                if (statusFilter === 'yes') matchStatus = ['có', '1', 'true'].includes(p);
                else if (statusFilter === 'no') matchStatus = ['không', '0', 'false'].includes(p);
                else if (statusFilter === 'other') matchStatus = !['có', '1', 'true', 'không', '0', 'false'].includes(p);

                // 2. Lọc Thời Gian
                let matchTime = true;

                // Chỉ lọc khi người dùng chọn loại và có dữ liệu đầu vào
                if (timeType === 'month' && monthVal && yearVal) {
                    const targetYM = `${yearVal}-${monthVal}`;
                    // Lấy YYYY-MM từ ngày tạo (cắt chuỗi ISO)
                    // Lưu ý: itemDate.toISOString() trả về giờ UTC.
                    // Nếu muốn chính xác giờ VN, nên dùng logic bên dưới:
                    const year = itemDate.getFullYear();
                    const month = String(itemDate.getMonth() + 1).padStart(2, '0');
                    const itemYM = `${year}-${month}`;

                    matchTime = itemYM === targetYM;
                }
                else if (timeType === 'range') {
                    if (startVal || endVal) {
                        // Chuyển itemDate về YYYY-MM-DD theo múi giờ địa phương
                        const year = itemDate.getFullYear();
                        const month = String(itemDate.getMonth() + 1).padStart(2, '0');
                        const day = String(itemDate.getDate()).padStart(2, '0');
                        const itemDateStr = `${year}-${month}-${day}`; // YYYY-MM-DD

                        const isAfterStart = startVal ? itemDateStr >= startVal : true;
                        const isBeforeEnd = endVal ? itemDateStr <= endVal : true;

                        matchTime = isAfterStart && isBeforeEnd;
                    }
                }

                // 3. Tìm kiếm
                let matchSearch = true;
                if (searchFilter) {
                    matchSearch = (item.name && item.name.toLowerCase().includes(searchFilter)) ||
                        (item.message && item.message.toLowerCase().includes(searchFilter));
                }

                return matchStatus && matchTime && matchSearch;
            });

            currentPage = 1;
            renderWishesPage();
        };

        const resetFilters = () => {
            document.getElementById('filter-presence').value = 'all';
            document.getElementById('filter-search').value = '';
            document.getElementById('time-filter-type').value = 'none';

            // Reset các input con
            document.getElementById('filter-month-val').value = '';
            document.getElementById('filter-year-val').value = '2025';
            document.getElementById('filter-date-start').value = '';
            document.getElementById('filter-date-end').value = '';

            toggleTimeFilter(); // Cập nhật UI
        };

        // --- HÀM MỚI: RENDER DANH SÁCH THEO TRANG ---
        const renderWishesPage = () => {
            const container = document.getElementById('wishes-manager-list');
            const paginationControls = document.getElementById('pagination-controls');

            if (!container) return;
            container.innerHTML = '';

            if (filteredData.length === 0) {
                container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fa-solid fa-filter-circle-xmark fa-3x mb-3"></i><p>Không tìm thấy kết quả nào phù hợp.</p></div>';
                document.getElementById('pagination-controls').classList.add('d-none');
                return;
            }

            paginationControls.classList.remove('d-none');

            // Tính toán cắt mảng
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = filteredData.slice(start, end);
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);

            // Render Items
            pageData.forEach(item => {
                const id = item.id || item._id;
                const starClass = item.is_highlight ? 'text-warning' : 'text-secondary';
                let presenceBadge = '';

                // Chuẩn hóa dữ liệu về chữ thường để so sánh (nếu là string)
                const presenceVal = String(item.presence).toLowerCase();

                if (['có', '1', 'true'].includes(presenceVal)) {
                    // TRƯỜNG HỢP: THAM DỰ
                    presenceBadge = '<span class="badge bg-success-subtle text-success rounded-pill me-1 border border-success-subtle"><i class="fa-solid fa-check me-1"></i>Tham dự</span>';
                }
                else if (['không', '0', 'false'].includes(presenceVal)) {
                    // TRƯỜNG HỢP: VẮNG MẶT
                    presenceBadge = '<span class="badge bg-danger-subtle text-danger rounded-pill me-1 border border-danger-subtle"><i class="fa-solid fa-xmark me-1"></i>Vắng mặt</span>';
                }
                else {
                    // TRƯỜNG HỢP: KHÁC (Admin thêm, Chưa biết, v.v...)
                    // Dùng màu xám hoặc vàng cho trung tính
                    presenceBadge = `<span class="badge bg-secondary-subtle text-secondary rounded-pill me-1 border border-secondary-subtle"><i class="fa-solid fa-question me-1"></i>${util.escapeHtml(item.presence || 'Khác')}</span>`;
                }

                // Encode dữ liệu để truyền vào hàm view
                const safeName = util.escapeHtml(item.name);
                const safeMsg = util.escapeHtml(item.message);
                const safeTime = new Date(item.created_at).toLocaleString();

                const html = `
                <div class="bg-white p-3 rounded-4 shadow-sm border mb-0 d-flex flex-column flex-sm-row justify-content-between gap-3" id="wish-row-${id}">
                    <div class="flex-grow-1" style="min-width: 0;"> <!-- min-width: 0 fix lỗi flex tràn text -->
                        <div class="d-flex align-items-center mb-1 flex-wrap gap-1">
                            <h6 class="fw-bold mb-0 me-2 text-truncate" style="max-width: 200px;">${safeName}</h6>
                            ${presenceBadge}
                            <small class="text-muted ms-auto ms-sm-0" style="font-size: 0.7rem;">${safeTime}</small>
                        </div>
                        
                        <!-- MESSAGE CẮT GỌN -->
                        <div class="d-flex align-items-center gap-1">
                            <p class="mb-0 text-secondary wish-message-truncate flex-grow-1" 
                               onclick="undangan.admin.viewWishDetail('${id}')"
                               title="Bấm để xem chi tiết">
                               ${safeMsg}
                            </p>
                            <small class="text-primary cursor-pointer fst-italic" 
                                   style="white-space: nowrap; font-size: 0.75rem;"
                                   onclick="undangan.admin.viewWishDetail('${id}')">
                                (Xem thêm)
                            </small>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center gap-2 flex-shrink-0 pt-2 pt-sm-0 border-top border-sm-0 mt-2 mt-sm-0">
                        <button class="btn btn-light btn-sm rounded-circle ${starClass} shadow-sm" 
                                onclick="window.toggleHighlight('${id}', ${!item.is_highlight})" title="Ghim">
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

            // Render Pagination Buttons
            renderPaginationButtons(totalPages);
        };

        const renderPaginationButtons = (totalPages) => {
            const ul = document.getElementById('pagination-ul');
            if (!ul) return;
            ul.innerHTML = '';

            // Nút Previous
            ul.insertAdjacentHTML('beforeend', `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <button class="page-link rounded-start-3" onclick="undangan.admin.changePage(${currentPage - 1})"><i class="fa-solid fa-angle-left"></i></button>
                </li>
            `);

            // Các trang (Logic thu gọn nếu nhiều trang: 1, 2, ..., 5, 6, ..., 10)
            for (let i = 1; i <= totalPages; i++) {
                // Hiển thị trang đầu, cuối, và xung quanh trang hiện tại
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    ul.insertAdjacentHTML('beforeend', `
                        <li class="page-item ${i === currentPage ? 'active' : ''}">
                            <button class="page-link" onclick="undangan.admin.changePage(${i})">${i}</button>
                        </li>
                    `);
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    ul.insertAdjacentHTML('beforeend', `<li class="page-item disabled"><span class="page-link">...</span></li>`);
                }
            }

            // Nút Next
            ul.insertAdjacentHTML('beforeend', `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <button class="page-link rounded-end-3" onclick="undangan.admin.changePage(${currentPage + 1})"><i class="fa-solid fa-angle-right"></i></button>
                </li>
            `);
        };

        // --- CÁC HÀM GỌI TỪ HTML ---
        window.changePage = (page) => {
            currentPage = page;
            renderWishesPage();
        };

        window.changePerPage = (num) => {
            itemsPerPage = parseInt(num);
            currentPage = 1; // Reset về trang 1
            renderWishesPage();
        };

        window.viewWishDetail = (id) => {
            const item = allWishesData.find(w => (w.id || w._id) === id);
            if (!item) return;

            document.getElementById('view-wish-name').textContent = item.name;
            document.getElementById('view-wish-time').textContent = new Date(item.created_at).toLocaleString();
            document.getElementById('view-wish-msg').textContent = item.message;

            const badge = document.getElementById('view-wish-presence');
            if (item.presence) {
                badge.innerHTML = '<span class="badge bg-success">Tham dự</span>';
            } else {
                badge.innerHTML = '<span class="badge bg-danger">Vắng mặt</span>';
            }

            // @ts-ignore
            const modal = new bootstrap.Modal(document.getElementById('viewWishModal'));
            modal.show();
        };

        // Hàm: Load danh sách lời chúc
        const loadWishesManager = async () => {
            const container = document.getElementById('wishes-manager-list');
            container.innerHTML = '<p class="text-center text-muted py-3"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</p>';

            try {
                const res = await request(HTTP_GET, SERVER_URL + '/api/wishes').token(session.getToken()).send();
                if (res.code === 200) {
                    allWishesData = res.data;
                    applyFilters();
                }
            } catch (e) {
                console.log(e);
                container.innerHTML = '<p class="text-center text-danger">Lỗi tải dữ liệu.</p>';
            }
        };

        // --- BIẾN TOÀN CỤC ĐỂ LƯU DỮ LIỆU ---
        let cachedWishesData = [];
        let pieChartInstance = null;
        let barChartInstance = null;

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
            /*document.getElementById('filterBadWord')?.closest('.form-check')?.remove();
            document.getElementById('replyComment')?.closest('.form-check')?.remove();
            document.getElementById('editComment')?.closest('.form-check')?.remove();
            document.getElementById('form-timezone')?.closest('.p-3')?.remove();
            document.getElementById('dashboard-tenorkey')?.closest('.p-3')?.remove();*/

            document.dispatchEvent(new Event('undangan.session'));

            // Load dữ liệu thống kê
            request(HTTP_GET, SERVER_URL + '/api/wishes')
                .token(session.getToken())
                .withCache(1000 * 30)
                .send()
                .then((resp) => {
                    const allWishes = resp.data;
                    cachedWishesData = allWishes; // <--- LƯU LẠI DỮ LIỆU ĐỂ LỌC SAU

                    // 1. TÍNH TOÁN SỐ LIỆU CƠ BẢN
                    const comments = allWishes.length;
                    let present = allWishes.filter(i => ['Có', '1', 'true', true, 1].includes(i.presence)).length;
                    let absent = allWishes.filter(i => ['Không', '0', 'false', false, 0].includes(i.presence)).length;
                    let unknown = comments - present - absent;

                    // Cập nhật UI số liệu
                    setText('count-comment', String(comments).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                    setText('count-present', String(present).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                    setText('count-absent', String(absent).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                    setText('count-like', '0');

                    // 3. VẼ BIỂU ĐỒ
                    renderPieChart(present, absent, unknown);
                    renderTrendChart(allWishes, 'week'); // Mặc định vẽ 7 ngày

                    // 4. HIỂN THỊ BẢNG LỜI CHÚC MỚI NHẤT
                    renderLatestWishes(allWishes);

                    // 5. Load danh sách quản lý
                    if (typeof loadWishesManager === 'function') loadWishesManager();
                });

        }).catch(err => {
            console.error("Lỗi tải thống kê:", err);
        });

        // VẼ BIÊU ĐỒ

        // --- CẤU HÌNH MÀU SẮC CHUNG ---
        //Chart.defaults.color = '#e0e0e0'; // Màu chữ sáng
        //Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'; // Màu đường kẻ mờ

        // Hàm gọi từ HTML khi chọn Dropdown
        window.updateTrendChart = (type) => {
            if (cachedWishesData.length > 0) {
                renderTrendChart(cachedWishesData, type);
            }
        };

        const renderPieChart = (present, absent, unknown) => {
            if (typeof Chart === 'undefined') {
                setTimeout(() => renderPieChart(present, absent, unknown), 500);
                return;
            }
            const ctx = document.getElementById('attendanceChart');
            if (!ctx) return;

            if (pieChartInstance) pieChartInstance.destroy();

            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Tham gia', 'Vắng mặt', 'Chưa rõ'],
                    datasets: [{
                        data: [present, absent, unknown],
                        backgroundColor: ['#3b82f6', '#ef4444', '#6b7280'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    color: '#e0e0e0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, color: '#e0e0e0' } }
                    },
                    cutout: '70%'
                }
            });
        };

        // HÀM VẼ BIỂU ĐỒ XU HƯỚNG (ĐÃ NÂNG CẤP)
        const renderTrendChart = (wishes, filterType = 'week') => {
            if (typeof Chart === 'undefined') {
                setTimeout(() => renderTrendChart(wishes, filterType), 500);
                return;
            }
            const ctx = document.getElementById('wishesTrendChart');
            if (!ctx) return;

            const dataMap = {};
            const labels = [];
            const dataPoints = [];

            // --- LOGIC XỬ LÝ DỮ LIỆU ---
            if (filterType === 'week') {
                // 7 ngày qua
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    labels.push(key);
                    dataMap[key] = 0;
                }
                wishes.forEach(w => {
                    const d = new Date(w.created_at);
                    const diffTime = Math.abs(new Date() - d);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) {
                        const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        if (dataMap[key] !== undefined) dataMap[key]++;
                    }
                });
            }
            else if (filterType === 'month') {
                // 30 ngày qua
                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    labels.push(key);
                    dataMap[key] = 0;
                }
                wishes.forEach(w => {
                    const d = new Date(w.created_at);
                    const diffTime = Math.abs(new Date() - d);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 30) {
                        const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        if (dataMap[key] !== undefined) dataMap[key]++;
                    }
                });
            }
            else if (filterType === 'year') {
                // 12 tháng qua
                for (let i = 11; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const key = `T${d.getMonth() + 1}/${d.getFullYear()}`;
                    labels.push(key);
                    dataMap[key] = 0;
                }
                wishes.forEach(w => {
                    const d = new Date(w.created_at);
                    const key = `T${d.getMonth() + 1}/${d.getFullYear()}`;
                    if (labels.includes(key)) dataMap[key]++;
                });
            }

            labels.forEach(lbl => dataPoints.push(dataMap[lbl]));

            if (barChartInstance) barChartInstance.destroy();

            barChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Số lời chúc',
                        data: dataPoints,
                        backgroundColor: filterType === 'year' ? '#10b981' : (filterType === 'month' ? '#f59e0b' : '#8b5cf6'),
                        borderRadius: 4,
                        barPercentage: filterType === 'month' ? 0.8 : 0.6
                    }]
                },
                options: {
                    color: '#e0e0e0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, color: '#e0e0e0' },
                            grid: { color: 'rgba(255, 255, 255, 0.05)' }
                        },
                        x: {
                            ticks: { color: '#e0e0e0', maxRotation: 45, minRotation: 45 },
                            grid: { display: false }
                        }
                    }
                }
            });
        };

        const renderLatestWishes = (wishes) => {
            const tbody = document.getElementById('latest-wishes-table');
            tbody.innerHTML = '';
            // Lấy 5 tin mới nhất
            const latest = wishes.slice(0, 5);

            latest.forEach(w => {
                let badgeClass = 'bg-secondary';
                let badgeText = 'Chưa rõ';

                if (w.presence === 'Có' || w.presence === true) { badgeClass = 'bg-success'; badgeText = 'Tham gia'; }
                else if (w.presence === 'Không' || w.presence === false) { badgeClass = 'bg-danger'; badgeText = 'Vắng mặt'; }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td class="fw-bold text-truncate" style="max-width: 150px;">${util.escapeHtml(w.name)}</td>
                <td><span class="badge ${badgeClass} rounded-pill">${badgeText}</span></td>
                <td class="text-truncate" style="max-width: 200px;">${util.escapeHtml(w.message)}</td>
                <td class="text-muted small">${new Date(w.created_at).toLocaleDateString('vi-VN')}</td>
            `;
                tbody.appendChild(tr);
            });
        };

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
            } catch (e) {
                console.log(e); // <-- Bạn nên log lỗi ra để xem nó là gì
                util.notify("Lỗi xóa").error();
            }
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
            window.changePage = changePage;
            window.changePerPage = changePerPage;
            window.viewWishDetail = viewWishDetail;
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
                updateConfig,
                changePage,
                changePerPage,
                viewWishDetail,
                applyFilters,
                resetFilters,
                toggleTimeFilter,
                renderPieChart,
                renderTrendChart,
                renderLatestWishes,
            },
        };
    };

    return { init };
};

export const admin = adminModule(); 