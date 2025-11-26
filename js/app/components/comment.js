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

    // --- XỬ LÝ HIỆU ỨNG CHẠM TRÊN MOBILE ---
    const setupTouchEffect = () => {
        const box = document.getElementById('wish-notification');
        if (box) {
            // Khi chạm vào: Thêm class 'is-touched' để làm rõ
            box.addEventListener('touchstart', () => {
                box.classList.add('is-touched');
                // Tạm dừng ẩn khi đang đọc
                clearTimeout(wishTimeout);
            }, {passive: true});

            // Khi thả tay ra (hoặc chạm chỗ khác): Chờ 3s rồi tiếp tục quy trình
            // Lưu ý: Logic này khá phức tạp trên web, để đơn giản:
            // Chạm vào -> Rõ -> Giữ nguyên trạng thái rõ 5s -> Tự mờ lại và chạy tiếp
            box.addEventListener('touchend', () => {
                setTimeout(() => {
                    box.classList.remove('is-touched');
                    // Gọi lại quy trình ẩn để tiếp tục vòng lặp
                    wishTimeout = setTimeout(() => {
                        box.classList.remove('show');
                        loopTimeout = setTimeout(() => {
                            currentIndex++;
                            if (currentIndex >= wishesData.length) currentIndex = 0;
                            showNextWish();
                        }, 3000);
                    }, 2000); // Cho đọc thêm 2s nữa
                }, 5000); // Giữ rõ 5s sau khi chạm
            });
        }
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

    const showNextWish = () => {
        if (!isWishesActive) return;

        const box = document.getElementById('wish-notification');
        const nameEl = document.getElementById('wish-name');
        const msgEl = document.getElementById('wish-message');

        if (!box || wishesData.length === 0) return;

        // Reset trạng thái chạm
        box.classList.remove('is-touched');

        const item = wishesData[currentIndex];
        nameEl.innerText = item.name;
        msgEl.innerText = item.message;

        box.classList.add('show');

        let displayTime = 5000;
        const length = item.message.length;
        if (length < 50) displayTime = 5000;
        else if (length < 150) displayTime = 12000;
        else displayTime = 20000;

        // Nếu là hover chuột (Desktop), CSS sẽ tự xử lý việc giữ hiển thị
        // JS chỉ lo việc đếm giờ ẩn đi thôi
        
        wishTimeout = setTimeout(() => {
            // Kiểm tra nếu đang hover thì ĐỪNG ẩn vội (cho người ta đọc)
            if (box.matches(':hover')) {
                // Đợi chuột rời đi rồi mới ẩn (Check mỗi 1s)
                const checkHover = setInterval(() => {
                    if (!box.matches(':hover')) {
                        clearInterval(checkHover);
                        hideAndNext();
                    }
                }, 1000);
            } else {
                hideAndNext();
            }
        }, displayTime);
        
        // Hàm phụ để ẩn và chuyển bài
        const hideAndNext = () => {
            box.classList.remove('show');
            loopTimeout = setTimeout(() => {
                currentIndex++;
                if (currentIndex >= wishesData.length) currentIndex = 0;
                // Nếu hết vòng thì lại Random lại danh sách cho đỡ chán
                if (currentIndex === 0) shuffleArray(wishesData); 
                showNextWish();
            }, 3000);
        };
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