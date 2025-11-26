import { util } from '../../common/util.js';

export const comment = (() => {

    // --- DÁN URL MỚI VÀO ĐÂY (URL BẠN VỪA DEPLOY NEW VERSION) ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwHxK_zKto0k8zjq-nCc8aK13f03_yy9NJO4nihSV8JVYGY2AMiHkjGYVXK787tQiWb/exec';

     let wishesData = [];
    let currentIndex = 0;
    let isWishesActive = true;
    let wishTimeout = null;
    let loopTimeout = null;

    const init = () => {
        setupFormSubmit();
        fetchWishes();
        setupToggleButton();
        setupTouchEffect(); // Thêm xử lý chạm mobile
    };

    // --- HÀM XÁO TRỘN MẢNG (FISHER-YATES SHUFFLE) ---
    // Giúp lời chúc hiển thị ngẫu nhiên, không theo thứ tự
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
                // Lọc dữ liệu rỗng
                let rawData = json.data.filter(item => item.message && item.message.trim() !== "");
                
                // --- RANDOM HÓA DỮ LIỆU ---
                wishesData = shuffleArray(rawData);

                if (wishesData.length > 0) {
                    if(isWishesActive) setTimeout(showNextWish, 3000);
                }
            }
        } catch (error) { console.error(error); }
    };

    // --- HÀM QUAN TRỌNG: HIỆN LỜI CHÚC ---
   const showNextWish = () => {
        if (!isWishesActive) return;

        const box = document.getElementById('wish-notification');
        const nameEl = document.getElementById('wish-name');
        const msgEl = document.getElementById('wish-message');

        if (!box || wishesData.length === 0) return;

        // 1. RESET TRẠNG THÁI TRƯỚC KHI HIỆN (Fix lỗi luôn sáng)
        box.classList.remove('show');      // Đảm bảo đang ẩn
        box.classList.remove('is-touched');// Xóa trạng thái chạm cũ
        
        // Buộc trình duyệt vẽ lại (Repaint) để hiệu ứng reset có tác dụng ngay
        void box.offsetWidth; 

        // 2. CẬP NHẬT DỮ LIỆU MỚI
        const item = wishesData[currentIndex];
        nameEl.innerText = item.name;
        msgEl.innerText = item.message;

        // 3. HIỆN LÊN (Trạng thái mờ mặc định của CSS .wish-box.show)
        box.classList.add('show');

        // 4. TÍNH TOÁN THỜI GIAN
        let displayTime = 5000;
        const length = item.message.length;
        if (length < 50) displayTime = 5000;
        else if (length < 150) displayTime = 12000;
        else displayTime = 20000;

        // 5. HẸN GIỜ ẨN
        wishTimeout = setTimeout(() => {
            // Kiểm tra: Nếu người dùng đang hover chuột hoặc đang chạm tay vào -> ĐỪNG ẨN VỘI
            if (box.matches(':hover') || box.classList.contains('is-touched')) {
                
                // Tạo vòng lặp kiểm tra mỗi 1s
                // Chỉ khi nào người dùng bỏ tay ra/bỏ chuột ra thì mới ẩn
                const checkInteract = setInterval(() => {
                    const stillHover = box.matches(':hover');
                    const stillTouch = box.classList.contains('is-touched');
                    
                    if (!stillHover && !stillTouch) {
                        clearInterval(checkInteract);
                        hideAndNext();
                    }
                }, 1000);
                
            } else {
                hideAndNext();
            }
        }, displayTime);
        
        // Hàm phụ: Ẩn và chuyển tiếp
        const hideAndNext = () => {
            box.classList.remove('show'); // Trượt ra ngoài
            
            // Fix lỗi kẹt: Đợi 600ms (bằng thời gian transition CSS) để nó trượt hết ra ngoài
            // Rồi mới tính thời gian nghỉ 3s
            setTimeout(() => {
                // Reset lại trạng thái một lần nữa cho chắc
                box.classList.remove('is-touched');
                
                loopTimeout = setTimeout(() => {
                    currentIndex++;
                    if (currentIndex >= wishesData.length) currentIndex = 0;
                    if (currentIndex === 0) shuffleArray(wishesData); 
                    showNextWish();
                }, 3000); // Nghỉ 3s
            }, 600); 
        };
    };

    // --- XỬ LÝ CHẠM TRÊN MOBILE (Sửa lại logic) ---
    const setupTouchEffect = () => {
        const box = document.getElementById('wish-notification');
        if (box) {
            // Chạm vào -> Sáng lên
            box.addEventListener('touchstart', () => {
                box.classList.add('is-touched');
            }, {passive: true});

            // Thả tay ra -> Vẫn giữ sáng thêm 3s cho đọc -> Rồi tự tắt sáng
            box.addEventListener('touchend', () => {
                setTimeout(() => {
                    box.classList.remove('is-touched'); 
                    // Sau khi remove class này, hàm checkInteract ở trên sẽ thấy và tự động gọi hideAndNext()
                }, 3000); 
            }, {passive: true});
            
            // Xử lý thêm click (đề phòng một số máy tính bảng)
            box.addEventListener('click', () => {
                 box.classList.toggle('is-touched');
            });
        }
    };

    // ... (Các phần setupToggleButton, setupFormSubmit giữ nguyên như cũ) ...
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
                    clearTimeout(wishTimeout);
                    clearTimeout(loopTimeout);
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
                            currentIndex = 0;
                            clearTimeout(wishTimeout);
                            clearTimeout(loopTimeout);
                            document.getElementById('wish-notification')?.classList.remove('show');
                            setTimeout(showNextWish, 500);
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