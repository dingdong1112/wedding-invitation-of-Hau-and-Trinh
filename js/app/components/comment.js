import { util } from '../../common/util.js';

export const comment = (() => {

    // --- DÁN URL MỚI VÀO ĐÂY (URL BẠN VỪA DEPLOY NEW VERSION) ---
    const SCRIPT_URL = '/api/wishes';

     let wishesData = [];
    let currentIndex = 0;
    let isWishesActive = true;
    
    // Biến lưu bộ đếm giờ
    let hideTimer = null;
    let nextTimer = null;

    const init = () => {
        setupFormSubmit();
        fetchWishes();
        setupToggleButton();
        setupInteraction(); // Cài đặt tương tác Chuột/Cảm ứng
    };

    // --- 1. CÀI ĐẶT TƯƠNG TÁC (QUAN TRỌNG NHẤT) ---
    const setupInteraction = () => {
        const box = document.getElementById('wish-notification');
        if (!box) return;

        // A. DÀNH CHO LAPTOP (Chuột)
        // Khi chuột vào: Hủy lệnh ẩn -> Giữ nguyên hiển thị
        box.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer); 
            // Đảm bảo trạng thái rõ nét
            box.classList.add('is-hovered'); 
        });

        // Khi chuột ra: Đếm ngược 2s rồi ẩn
        box.addEventListener('mouseleave', () => {
            box.classList.remove('is-hovered');
            // Nếu đang hiện thì mới hẹn giờ ẩn
            if (box.classList.contains('show')) {
                startHideTimer(2000); // Đọc xong bỏ chuột ra thì 2s sau mới ẩn
            }
        });

        // B. DÀNH CHO ĐIỆN THOẠI (Cảm ứng)
        // Chạm vào: Hủy ẩn -> Sáng lên
        box.addEventListener('touchstart', () => {
            clearTimeout(hideTimer);
            box.classList.add('is-touched');
        }, {passive: true});

        // Thả tay ra: Đếm ngược 5s rồi ẩn
        box.addEventListener('touchend', () => {
            setTimeout(() => {
                box.classList.remove('is-touched');
                if (box.classList.contains('show')) {
                    startHideTimer(5000); 
                }
            }, 200); // Delay nhỏ để mượt UI
        }, {passive: true});
    };

    // --- 2. HÀM BẮT ĐẦU ĐẾM NGƯỢC ĐỂ ẨN ---
    const startHideTimer = (duration) => {
        clearTimeout(hideTimer); // Xóa timer cũ nếu có
        hideTimer = setTimeout(() => {
            hideAndNext();
        }, duration);
    };

    // --- 3. HÀM ẨN VÀ CHUYỂN TIẾP ---
    const hideAndNext = () => {
        const box = document.getElementById('wish-notification');
        if (!box) return;

        // Bắt đầu trượt ra
        box.classList.remove('show');
        
        // Reset các trạng thái sáng (để lần sau hiện lên là mờ)
        box.classList.remove('is-touched'); 
        box.classList.remove('is-hovered');

        // Đợi 0.8s cho CSS trượt xong hẳn rồi mới gọi cái mới
        // (CSS transition đang để 0.6s, ta đợi 0.8s cho an toàn)
        clearTimeout(nextTimer);
        nextTimer = setTimeout(() => {
            currentIndex++;
            if (currentIndex >= wishesData.length) currentIndex = 0;
            if (currentIndex === 0) shuffleArray(wishesData); 
            
            // Gọi cái tiếp theo
            showNextWish();
        }, 3000); // Nghỉ 3s giữa 2 tin
    };

    // --- 4. HÀM HIỂN THỊ ---
    const showNextWish = () => {
        if (!isWishesActive) return;

        const box = document.getElementById('wish-notification');
        const nameEl = document.getElementById('wish-name');
        const msgEl = document.getElementById('wish-message');

        if (!box || wishesData.length === 0) return;

        // Reset timer
        clearTimeout(hideTimer);
        clearTimeout(nextTimer);

        // Cập nhật nội dung
        const item = wishesData[currentIndex];
        nameEl.innerText = item.name;
        msgEl.innerText = item.message;

        // Hiện lên (Trạng thái mờ mặc định)
        box.classList.add('show');

        // Tính thời gian hiển thị tự động
        let displayTime = 3000;
        const length = item.message.length;
        if (length < 70) displayTime = 3000;
        else if (length < 180) displayTime = 6000;
        else displayTime = 9000;

        // Bắt đầu đếm giờ ẩn (Nếu người dùng không tương tác)
        startHideTimer(displayTime);
    };

    // ... (Các phần fetchWishes, shuffleArray, setupFormSubmit giữ nguyên) ...
    
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const fetchWishes = async () => {
        try {
            const response = await fetch(SCRIPT_URL);
            const json = await response.json();
            if (json.result === 'success' && json.data.length > 0) {
                let rawData = json.data.filter(item => item.message && item.message.trim() !== "");
                wishesData = shuffleArray(rawData);
                if (wishesData.length > 0) {
                    if(isWishesActive) setTimeout(showNextWish, 4000);
                }
            }
        } catch (error) { console.error(error); }
    };

    const setupToggleButton = () => {
        const btn = document.getElementById('wishes-toggle-button');
        const box = document.getElementById('wish-notification');
        if (btn) {
            btn.addEventListener('click', () => {
                isWishesActive = !isWishesActive;
                if (isWishesActive) {
                    btn.classList.add('active');
                    showNextWish();
                } else {
                    btn.classList.remove('active');
                    if(box) box.classList.remove('show');
                    clearTimeout(hideTimer);
                    clearTimeout(nextTimer);
                }
            });
        }
    };

    const setupFormSubmit = () => {
        const form = document.getElementById('wishes-form');
        const btn = document.getElementById('btn-send-wish');
        const successMsg = document.getElementById('success-msg');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const originalBtnText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi...';
                const data = new FormData(form);
                fetch(SCRIPT_URL, { method: 'POST', body: data })
                    .then(response => {
                        form.reset();
                        successMsg.classList.remove('d-none');
                        setTimeout(() => successMsg.classList.add('d-none'), 5000);
                        const tempWish = { name: data.get('Ten'), message: data.get('LoiChuc') };
                        wishesData.unshift(tempWish);
                        if(isWishesActive) {
                            // Reset quy trình để hiện tin mới ngay
                            clearTimeout(hideTimer);
                            clearTimeout(nextTimer);
                            const box = document.getElementById('wish-notification');
                            if(box) box.classList.remove('show');
                            
                            currentIndex = 0; // Đưa về đầu (tin mới nhất)
                            setTimeout(showNextWish, 600);
                        }
                    })
                    .catch(error => { util.notify("Lỗi gửi!").error(); })
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalBtnText;
                    });
            });
        }
    };

    return { init, show: () => {}, send: () => {} };
})();