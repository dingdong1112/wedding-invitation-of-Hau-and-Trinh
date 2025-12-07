import { video } from './video.js';
import { image } from './image.js';
import { audio } from './audio.js';
import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { bs } from '../../libs/bootstrap.js';
import { loader } from '../../libs/loader.js';
import { theme } from '../../common/theme.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { offline } from '../../common/offline.js';
import { comment } from '../components/comment.js';
//import confetti from '../../libs/confetti.js';
import { pool } from '../../connection/request.js';

// --- CẤU HÌNH VÀ BIẾN GLOBAL ---
const VERCEL_BASE_URL = 'https://wedding-invitation-of-hau-and-chin.vercel.app';
const BOOK_RATIO = 1.4; // Width / Height chuẩn, chỉnh theo ảnh thực tế
let allImagesUrls = [];
let pageFlipInstance = null; // Instance của PageFlip
let galleryCache = null; // Cache danh sách ảnh
let currentDetailIndex = 0;

export const guest = (() => {

    let isConfettiOn = true;
    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let information = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let config = null;

    /**
     * @returns {void}
     */
    const countDownDate = () => {
        const count = (new Date(document.body.getAttribute('data-time').replace(' ', 'T'))).getTime();

        /**
         * @param {number} num 
         * @returns {string}
         */
        const pad = (num) => num < 10 ? `0${num}` : `${num}`;

        const day = document.getElementById('day');
        const hour = document.getElementById('hour');
        const minute = document.getElementById('minute');
        const second = document.getElementById('second');

        const updateCountdown = () => {
            const distance = Math.abs(count - Date.now());

            day.textContent = pad(Math.floor(distance / (1000 * 60 * 60 * 24)));
            hour.textContent = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            minute.textContent = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
            second.textContent = pad(Math.floor((distance % (1000 * 60)) / 1000));

            util.timeOut(updateCountdown, 1000 - (Date.now() % 1000));
        };

        util.timeOut(updateCountdown);
    };

    /**
     * @returns {void}
     */
    const showGuestName = () => {
        /**
         * Make sure "to=" is the last query string.
         * Ex. ulems.my.id/?id=some-uuid-here&to=name
         */
        const raw = window.location.search.split('to=');
        let name = null;

        if (raw.length > 1 && raw[1].length >= 1) {
            name = window.decodeURIComponent(raw[1]);
        }

        if (name) {
            const guestName = document.getElementById('guest-name');
            const div = document.createElement('div');
            div.classList.add('m-2');

            const template = `<small class="mt-0 mb-1 mx-0 p-0">${util.escapeHtml(guestName?.getAttribute('data-message'))}</small><p class="m-0 p-0" style="font-size: 1.25rem">${util.escapeHtml(name)}</p>`;
            util.safeInnerHTML(div, template);

            guestName?.appendChild(div);
        }

        const form = document.getElementById('form-name');
        if (form) {
            form.value = information.get('name') ?? name;
        }
    };

    /**
     * @returns {Promise<void>}
     */
    const slide = async () => {
        const interval = 6000;
        const slides = document.querySelectorAll('.slide-desktop');

        if (!slides || slides.length === 0) {
            return;
        }

        const desktopEl = document.getElementById('root')?.querySelector('.d-sm-block');
        if (!desktopEl) {
            return;
        }

        desktopEl.dispatchEvent(new Event('undangan.slide.stop'));

        if (window.getComputedStyle(desktopEl).display === 'none') {
            return;
        }

        if (slides.length === 1) {
            await util.changeOpacity(slides[0], true);
            return;
        }

        let index = 0;
        for (const [i, s] of slides.entries()) {
            if (i === index) {
                s.classList.add('slide-desktop-active');
                await util.changeOpacity(s, true);
                break;
            }
        }

        let run = true;
        const nextSlide = async () => {
            await util.changeOpacity(slides[index], false);
            slides[index].classList.remove('slide-desktop-active');

            index = (index + 1) % slides.length;

            if (run) {
                slides[index].classList.add('slide-desktop-active');
                await util.changeOpacity(slides[index], true);
            }

            return run;
        };

        desktopEl.addEventListener('undangan.slide.stop', () => {
            run = false;
        });

        const loop = async () => {
            if (await nextSlide()) {
                util.timeOut(loop, interval);
            }
        };

        util.timeOut(loop, interval);
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {void}
     */
    const open = (button) => {
        const serverConfig = window.SERVER_CONFIG; // Lấy config đã tải ở pageLoaded

        // TÌM KIẾM TẤT CẢ ELEMENT CẦN THAO TÁC (SAFE ACCESS)
        const particleController = document.getElementById('particle-toggle-button');
        const wishesToggleButton = document.getElementById('wishes-toggle-button');
        const sendForm = document.getElementById('wishes-form');
        const sendBtn = document.getElementById('btn-send-wish');

        // Element Đĩa than (Vinyl)
        const vinylContainer = document.getElementById('vinyl-container');
        const vinylGrooves = document.querySelector('.vinyl-grooves'); // Dùng class vì nó nằm trong container
        const vinylHole = document.querySelector('.vinyl-hole');
        const vinylNeedle = document.querySelector('.vinyl-needle');
        const vinylDisk = document.querySelector('.vinyl-disk');

        // Nút điều khiển nhạc tổng (của bạn là Music Toggle Button)
        const musicToggle = document.getElementById('music-toggle-btn'); // Sử dụng ID chính xác
        const aud = audio.init();

        button.disabled = true;
        document.body.scrollIntoView({ behavior: 'instant' });
        document.getElementById('root').classList.remove('opacity-0');

        if (theme.isAutoMode()) {
            document.getElementById('button-theme').classList.remove('d-none');
        }

        // A. HIỆU ỨNG ĐŨA THẦN VÀ PHÁO HOA (confetti_enabled)
        if (particleController) {
            if (serverConfig.confetti_enabled) { // Dùng confetti_enabled để kiểm tra bật/tắt nút
                particleController.style.display = 'flex'; // Hiện nút
                setupParticleControls();
            } else {
                particleController.style.display = 'none'; // Ẩn nút nếu config tắt
            }
        }

        const config = storage('config');
        if (typeof window.confetti === 'function' && config.get('confetti_enabled')) {
            window.confetti();
            util.timeOut(window.confetti, 1500);

            // Nếu có animation rơi (ve), cũng phải kiểm tra config
            // Ve là animation rơi liên tục.
            //util.timeOut(ve, 1500);
        }

        //B. HIỆU ỨNG ĐĨA THAN + PHÁT NHẠC + ICON QL NHẠC (vinyl_enabled)
        if (vinylContainer) {
            if (!serverConfig.vinyl_enabled) {
                vinylGrooves?.style.setProperty('display', 'none');
                vinylHole?.style.setProperty('display', 'none');
                vinylNeedle?.style.setProperty('display', 'none');
                // Element chính (disk) vẫn hiện nhưng không xoay
                vinylDisk?.style.setProperty('display', 'block');
                musicToggle?.style.setProperty('display', 'none'); // Ẩn nút QL nhạc
                aud.load(false); // Load nhạc nhưng không tự phát
            } else {
                // BẬT HIỆU ỨNG ĐĨA THAN
                vinylGrooves?.style.setProperty('display', 'block');
                vinylHole?.style.setProperty('display', 'block');
                vinylNeedle?.style.setProperty('display', 'block');
                vinylDisk?.style.setProperty('display', 'block');
                musicToggle?.style.setProperty('display', 'flex'); // Hiện nút QL nhạc
                aud.load(serverConfig.music_enabled); // Load và tự phát nếu config cho phép
            }
        }

        // C. KHÓA FORM GỬI LỜI CHÚC (comment_lock_enabled)
        if (serverConfig.can_delete && sendForm) {
            sendForm.remove(); // Xóa form hoàn toàn (hoặc ẩn đi)
            if (sendBtn) sendBtn.disabled = true; // Khóa nút nếu vẫn giữ form

            // Thêm thông báo bảo trì nếu cần
            const container = document.getElementById('comment')?.querySelector('.container');
            if (container) {
                container.insertAdjacentHTML('afterbegin',
                    '<div class="alert alert-danger rounded-4 shadow-sm text-center">Chức năng Gửi Lời Chúc đang bảo trì.</div>');
            }
        }

        // D. POP-UP LỜI CHUC (wishes_popup_enabled)
        if (serverConfig.wishes_popup_enabled) {
            wishesToggleButton.style.display = 'flex';
            comment.init();
        } else {
            wishesToggleButton.style.display = 'none';
        }

        slide();
        theme.spyTop();

        document.dispatchEvent(new Event('undangan.open'));
        util.changeOpacity(document.getElementById('welcome'), false).then((el) => el.remove());
    };

    /**
     * @param {HTMLImageElement} img
     * @returns {void}
     */
    const modal = (img) => {
        document.getElementById('button-modal-click').setAttribute('href', img.src);
        document.getElementById('button-modal-download').setAttribute('data-src', img.src);

        const i = document.getElementById('show-modal-image');
        i.src = img.src;
        i.width = img.width;
        i.height = img.height;
        bs.modal('modal-image').show();
    };

    /**
     * @returns {void}
     */
    const modalImageClick = () => {
        document.getElementById('show-modal-image').addEventListener('click', (e) => {
            const abs = e.currentTarget.parentNode.querySelector('.position-absolute');

            abs.classList.contains('d-none')
                ? abs.classList.replace('d-none', 'd-flex')
                : abs.classList.replace('d-flex', 'd-none');
        });
    };

    /**
     * @param {HTMLDivElement} div 
     * @returns {void}
     */
    const showStory = (div) => {
        if (navigator.vibrate) {
            navigator.vibrate(500);
        }

        //confetti.tapTapAnimation(div, 100);
        if (typeof window.confetti === 'function') {
            window.confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        util.changeOpacity(div, false).then((e) => e.remove());
    };

    /**
     * @returns {void}
     */
    const closeInformation = () => information.set('info', true);

    /**
     * @returns {void}
     */
    const normalizeArabicFont = () => {
        document.querySelectorAll('.font-arabic').forEach((el) => {
            el.innerHTML = String(el.innerHTML).normalize('NFC');
        });
    };

    /**
     * @returns {void}
     */
    const animateSvg = () => {
        document.querySelectorAll('svg').forEach((el) => {
            if (el.hasAttribute('data-class')) {
                util.timeOut(() => el.classList.add(el.getAttribute('data-class')), parseInt(el.getAttribute('data-time')));
            }
        });
    };

    /**
     * @returns {void}
     */
    const buildGoogleCalendar = () => {
        /*    /**
             * @param {string} d 
             * @returns {string}
             
            const formatDate = (d) => (new Date(d.replace(' ', 'T') + ':00Z')).toISOString().replace(/[-:]/g, '').split('.').shift();
    
            const url = new URL('https://calendar.google.com/calendar/render');
            const data = new URLSearchParams({
                action: 'TEMPLATE',
                text: 'The Wedding of Wahyu and Riski',
                dates: `${formatDate('2023-03-15 10:00')}/${formatDate('2023-03-15 11:00')}`,
                details: 'Tanpa mengurangi rasa hormat, kami mengundang Anda untuk berkenan menghadiri acara pernikahan kami. Terima kasih atas perhatian dan doa restu Anda, yang menjadi kebahagiaan serta kehormatan besar bagi kami.',
                location: 'RT 10 RW 02, Desa Pajerukan, Kec. Kalibagor, Kab. Banyumas, Jawa Tengah 53191.',
                ctz: config.get('tz'),
            });
    
            url.search = data.toString();
            document.querySelector('#home button')?.addEventListener('click', () => window.open(url, '_blank'));*/
    };

    /**
     * @returns {object}
     */
    const loaderLibs = () => {
        progress.add();

        /**
         * @param {{aos: boolean, confetti: boolean}} opt
         * @returns {void}
         */
        const load = (opt) => {
            loader(opt)
                .then(() => progress.complete('libs'))
                .catch(() => progress.invalid('libs'));
        };

        return {
            load,
        };
    };

    /**
     * @returns {Promise<void>}
     */
    const booting = async () => {
        //animateSvg();

        const config = storage('config');
        const isConfettiOn = config.get('confetti_enabled');

        if (isConfettiOn) {
            animateSvg(); // Chỉ chạy animation SVG nếu confetti được bật
        }

        countDownDate();
        showGuestName();
        modalImageClick();
        normalizeArabicFont();
        //buildGoogleCalendar();

        if (information.has('presence')) {
            document.getElementById('form-presence').value = information.get('presence') ? '1' : '2';
        }

        if (information.get('info')) {
            document.getElementById('information')?.remove();
        }

        // wait until welcome screen is show.
        await util.changeOpacity(document.getElementById('welcome'), true);

        // remove loading screen and show welcome screen.
        await util.changeOpacity(document.getElementById('loading'), false).then((el) => el.remove());
    };

    /**
     * @returns {void}
     */
    const pageLoaded = async () => {
        // 1. Khởi tạo các module cơ bản
        lang.init();
        offline.init();
        progress.init();
        const vid = video.init();
        const img = image.init();
        //const aud = audio.init();
        const lib = loaderLibs();
        //const aud = audio.init();
        //const cmt = comment.init();

        information = storage('information');
        config = storage('config');

        // 2. Lấy Cấu Hình từ Server (Chặn và chờ kết quả)
        let serverConfig = {
            confetti_enabled: document.body.getAttribute('data-confetti') === 'true'
        };
        try {
            const res = await fetch('/api/config');
            if (res.status === 200) {
                const json = await res.json();
                serverConfig = json.data;
                Object.entries(serverConfig).forEach(([k, v]) => config.set(k, v));
            }
        } catch (e) {
            console.warn("Lỗi tải config, dùng mặc định:", e);
        }

        // Cần đảm bảo các element có sẵn để tránh lỗi JS
        //const vinylContainer = document.getElementById('vinyl-container');
        //const particleController = document.getElementById('particle-toggle-button');
        //const wishesToggleButton = document.getElementById('wishes-toggle-button');
        //const controlsPanel = document.getElementById('particle-controls');

        /* 2. Lấy Cấu Hình từ Server (MongoDB)
        let serverConfig = {
            confetti_enabled: document.body.getAttribute('data-confetti') === 'true'
        };

        try {
            // Serverless Function sẽ tự thêm hostname
            const res = await fetch('/api/config');
            if (res.status === 200) {
                const json = await res.json();
                serverConfig = json.data;
                // Lưu cấu hình vào storage để các module khác sử dụng
                Object.entries(serverConfig).forEach(([k, v]) => config.set(k, v));
            }
        } catch (e) {
            console.warn("Lỗi tải config, dùng mặc định.");
        }*/

        // 3. Quyết định trạng thái Khởi động (Lưu vào scope chung)
        window.SERVER_CONFIG = serverConfig;

        // 4. Tải tài nguyên (Chạy song song cho nhanh)
        vid.load();
        img.load();
        lib.load(true, false);
        //aud.load(serverConfig.music_enabled);


        // 4. Xử lý sự kiện giao diện (Giữ nguyên)
        window.addEventListener('resize', util.debounce(slide));
        document.addEventListener('undangan.progress.done', () => booting());
        document.addEventListener('hide.bs.modal', () => document.activeElement?.blur());

        const btnDownload = document.getElementById('button-modal-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', (e) => {
                img.download(e.currentTarget.getAttribute('data-src'));
            });
        }

        console.log("Ép chạy booting...");
        setTimeout(() => {
            booting(); 
        }, 500); // Chờ 0.5s rồi ép mở màn hình
    };


    // --- BẮT ĐẦU CODE TẠO LINK LỊCH ---
    const initializeCalendarLinks = () => {
        // Vô hiệu hóa hàm cũ để tránh xung đột
        const oldCalendarButton = document.querySelector('#home button.dropdown-toggle');
        if (oldCalendarButton) {
            // Đây là một cách "mạnh tay" để gỡ bỏ mọi event listener cũ
            const newButton = oldCalendarButton.cloneNode(true);
            oldCalendarButton.parentNode.replaceChild(newButton, oldCalendarButton);
            // Kích hoạt lại tính năng dropdown của Bootstrap cho nút mới
            new bootstrap.Dropdown(newButton);
        }

        const eventTitle = "Lễ Cưới Duy Hậu & Diễm Trinh";
        const eventDescription = "Trân trọng kính mời bạn đến tham dự lễ thành hôn của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi.";
        const eventLocation = "Địa chỉ tổ chức sự kiện, ABC, XYZ";
        const eventDurationHours = 4;

        const startTimeString = document.body.getAttribute('data-time');
        if (!startTimeString) return;

        const startTime = new Date(startTimeString.replace(/-/g, '/'));
        const endTime = new Date(startTime.getTime() + eventDurationHours * 60 * 60 * 1000);

        // Tạo link Google Calendar
        const formatGoogleDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');
        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
        document.getElementById('google-calendar-link')?.setAttribute('href', googleLink);

        // Tạo Data URI cho các lịch khác
        window.ics.addEvent(eventTitle, eventDescription, eventLocation, startTime, endTime);
        const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(window.ics.build());

        const icsLinkElements = document.querySelectorAll('#ics-calendar-link, #outlook-calendar-link, #yahoo-calendar-link');
        const fileName = "dam-cuoi.ics";

        icsLinkElements.forEach(element => {
            element.setAttribute('href', dataUri);
            element.setAttribute('download', fileName);
        });
    };
    // --- KẾT THÚC CODE TẠO LINK LỊCH ---

    // --- BẮT ĐẦU CODE ĐIỀU KHIỂN HIỆU ỨNG RƠI (PHIÊN BẢN TÁI CẤU TRÚC) ---
    const setupParticleControls = () => {
        // === Phần 1: Lấy các element cần thiết ===
        const toggleButton = document.getElementById('particle-toggle-button');
        const controlsPanel = document.getElementById('particle-controls');

        const shapeSelect = document.getElementById('particle-shape');
        const durationSelect = document.getElementById('particle-duration');
        const sizeSlider = document.getElementById('particle-size');
        const densitySlider = document.getElementById('particle-density');

        if (!toggleButton || !controlsPanel) return;

        // === Phần 2: Khai báo các biến trạng thái ===
        // Đặt các biến này ở phạm vi rộng hơn để chúng không bị reset
        let effectInterval = null;
        let durationTimeout = null;

        // === Phần 3: Hàm chính để bắn confetti MỘT LẦN ===
        const fireConfetti = () => {
            if (typeof window.confetti !== 'function') return;

            const shape = shapeSelect.value;
            const size = parseFloat(sizeSlider.value);
            const density = parseInt(densitySlider.value);
            // --- KHO MÃ SVG (DATA SHAPES) ---

            // 1. BỘ SƯU TẬP BÔNG TUYẾT (SNOWFLAKES)
            const snowPaths = [
                // Mẫu 1: Tuyết tinh thể cổ điển (giống hình số 2)
                "M22 11h-4.17l2.08-2.08c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L14.91 11H9.09l-3.59-3.59c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L6.17 11H2c-.55 0-1 .45-1 1s.45 1 1 1h4.17l-2.08 2.08c-.39.39-.39 1.02 0 1.41.2.2.45.29.71.29s.51-.1.71-.29l3.59-3.59h5.82l3.59 3.59c.2.2.45.29.71.29s.51-.1.71-.29c.39-.39.39-1.02 0-1.41L17.83 13H22c.55 0 1-.45 1-1s-.45-1-1-1z",
                // Mẫu 2: Tuyết lục giác đặc (giống hình số 5/10)
                "M11.99 2L2 7.77v11.54L11.99 25.08l9.99-5.77V7.77L11.99 2zM12 22.4l-8-4.62v-9.24l8-4.62l8 4.62v9.24l-8 4.62z",
                // Mẫu 3: Tuyết hoa văn (giống hình số 6)
                "M21 11h-.77c.69-1.36 1.45-2.29 1.48-2.32a.992.992 0 0 0-.28-1.39c-.47-.27-1.08-.11-1.36.36-.03.05-.83 1.27-1.63 2.88L15.76 5.9c1.61-.8 2.83-1.6 2.88-1.63.47-.28.63-.89.36-1.36a1.003 1.003 0 0 0-1.39-.28c-.03.03-.96.79-2.32 1.48V3c0-.55-.45-1-1-1s-1 .45-1 1v1.11c-1.36-.69-2.29-1.45-2.32-1.48a.992.992 0 0 0-1.39.28c-.27.47-.11 1.08.36 1.36.05.03 1.27.83 2.88 1.63L8.24 10.53c-1.61-.8-2.83-1.6-2.88-1.63-.47-.27-1.08-.11-1.36.36-.28.47-.11 1.09.36 1.36.03.03.79.96 1.48 2.32H5c-.55 0-1 .45-1 1s.45 1 1 1h.83c-.69 1.36-1.45 2.29-1.48 2.32-.27.47-.11 1.08.36 1.36.19.11.39.17.6.17.31 0 .62-.12.8-.39.05-.03 1.27-.83 2.88-1.63l2.68 4.64c-1.61.8-2.83 1.6-2.88 1.63-.47.28-.63.89-.36 1.36.17.29.49.47.82.47.18 0 .36-.06.53-.16.03-.03.96-.79 2.32-1.48V23c0 .55.45 1 1 1s1-.45 1-1v-1.11c1.36.69 2.29 1.45 2.32 1.48.17.1.35.16.53.16.34 0 .65-.17.82-.47.27-.47.11-1.08-.36-1.36-.05-.03-1.27-.83-2.88-1.63l2.68-4.64c1.61.8 2.83 1.6 2.88 1.63.18.11.38.16.57.16.32 0 .63-.13.82-.4.27-.47.11-1.08-.36-1.36-.03-.03-.79-.96-1.48-2.32H21c.55 0 1-.45 1-1s-.45-1-1-1zm-9 1.83l-2.2-3.81 3.81 2.2-1.61.93v1.61zm-1.61-5.66l2.2 3.81-3.81-2.2 1.61-.93V7.17zM9.17 13l3.81 2.2-2.2-3.81-.93 1.61H8.24zm5.66 1.61l-2.2-3.81 3.81 2.2-1.61.93h-1.68z"
            ];

            // 2. BỘ SƯU TẬP NGÔI SAO (STARS)
            const starPaths = [
                // Sao 5 cánh chuẩn
                "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
                // Sao 4 cánh (Lấp lánh)
                "M12,2L14.5,9.5L22,12L14.5,14.5L12,22L9.5,14.5L2,12L9.5,9.5L12,2Z",
                // Sao 8 cánh (Burst)
                "M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"
            ];

            // 3. BỘ SƯU TẬP TRÁI TIM (HEARTS)
            const heartPaths = [
                // Tim đặc chuẩn (Material)
                "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
                // Tim bầu bĩnh (Cute)
                "M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402m5.726-20.583c-2.203 0-4.446 1.042-5.726 3.238-1.285-2.206-3.522-3.248-5.719-3.248-3.183 0-6.281 2.187-6.281 6.191 0 4.661 5.571 9.429 12 15.809 6.43-6.38 12-11.148 12-15.809 0-4.011-3.095-6.181-6.274-6.181"
            ];

            // 4. BỘ SƯU TẬP KIM TUYẾN (CONFETTI SHAPES)
            const confettiPaths = [
                "M0 0h24v10H0z", // Chữ nhật dài
                "M0 0h12v12H0z", // Vuông
                "M12 2L2 22h20L12 2z" // Tam giác
            ];

            const createShapes = (paths) => {
                return paths.map(path => window.confetti.shapeFromPath({ path: path }));
            };

            let confettiOptions = {
                particleCount: density / 5,
                angle: 90,
                spread: 180,
                origin: { x: Math.random(), y: Math.random() - 0.2 },
                flat: true,
                gravity: 0.5,
                drift: Math.random() * 0.5 - 0.25,
                disableForReducedMotion: true,
                zIndex: 9999
            };

            // --- XỬ LÝ TỪNG LOẠI ---
            switch (shape) {
                case 'svg-heart':
                    confettiOptions.shapes = createShapes(heartPaths);
                    // Thêm màu trắng/hồng nhạt vào bộ màu đỏ để tạo chiều sâu
                    confettiOptions.colors = ['#FFC0CB', '#FF69B4', '#FF1493', '#C71585', '#DC143C', '#FFFFFF'];
                    confettiOptions.scalar = size * 2;
                    break;

                case 'stars':
                    confettiOptions.shapes = createShapes(starPaths);
                    confettiOptions.colors = ['#FFD700', '#FDB813', '#FFFACD', '#E5C100', '#FFFFFF'];
                    confettiOptions.scalar = size * 1.5;
                    break;

                case 'snow':
                    confettiOptions.shapes = createShapes(snowPaths);
                    confettiOptions.colors = ['#FFFFFF', '#E0FFFF', '#CAE9F5', '#F0F8FF'];
                    confettiOptions.scalar = size * 1.5;
                    confettiOptions.drift = Math.random() * 1 - 0.5;
                    confettiOptions.gravity = 0.35; // Tuyết rơi chậm hơn
                    break;

                case 'confetti':
                default:
                    confettiOptions.shapes = createShapes(confettiPaths);
                    confettiOptions.scalar = size * 1.2;
                    // Để màu mặc định (random) cho kim tuyến
                    break;
            }

            window.confetti(confettiOptions);
        };

        // === Phần 4: Hàm để Bắt đầu hoặc Cập nhật hiệu ứng ===
        const startOrUpdateEffect = () => {
            // LUÔN LUÔN dọn dẹp hiệu ứng cũ trước khi làm bất cứ điều gì
            if (effectInterval) clearInterval(effectInterval);
            if (durationTimeout) clearTimeout(durationTimeout);

            const duration = parseInt(durationSelect.value);
            if (duration === 0) return; // Nếu chọn "Dừng lại", chỉ cần dọn dẹp là đủ

            // Lên lịch để tự động dừng (nếu cần)
            if (duration > 0) {
                durationTimeout = setTimeout(() => {
                    if (effectInterval) clearInterval(effectInterval);
                }, duration * 1000);
            }

            // Tạo một vòng lặp MỚI với các cài đặt hiện tại
            const density = parseInt(densitySlider.value);
            const intervalTime = Math.max(50000 / density, 500);
            effectInterval = setInterval(fireConfetti, intervalTime);
        };

        // === Phần 5: Gắn các sự kiện ===
        toggleButton.addEventListener('click', () => {
            // ==> THÊM ĐOẠN NÀY: Đóng bảng nhạc nếu đang mở
            if (window.musicPlayer && typeof window.musicPlayer.closePanel === 'function') {
                window.musicPlayer.closePanel();
            }
            console.log("Toggling particle controls panel.");

            // Sau đó mới mở/đóng bảng pháo hoa
            controlsPanel.classList.toggle('show');
        });

        // Tất cả các thay đổi trong bảng điều khiển đều sẽ gọi cùng một hàm
        [shapeSelect, durationSelect, sizeSlider, densitySlider].forEach(el => {
            el.addEventListener('change', startOrUpdateEffect);
        });

        // === Phần 6: Khởi chạy lần đầu ===
        // Chờ cho thư viện sẵn sàng rồi mới bắt đầu
        function initialLaunch() {
            if (typeof window.confetti === 'function') {
                startOrUpdateEffect();
            } else {
                setTimeout(initialLaunch, 100);
            }
        }
        initialLaunch();
    };
    // --- KẾT THÚC CODE ĐIỀU KHIỂN HIỆU ỨNG RƠI ---

    //BẮT ĐẦU CODE PHẦN PAGE-TURNING ANIMATION CHO ẢNH THƯ VIỆN ---
    // --- HÀM 1: TẢI DANH SÁCH ẢNH TỪ API (Đã sửa để dùng Vercel URL) ---
    /** @returns {Promise<string[]>} */
    const fetchGalleryImages = async (ext = 'webp') => {
        // 1. KIỂM TRA TRONG LOCAL STORAGE (Lưu cache kể cả khi F5)
        const CACHE_KEY = `gallery_images_${ext}`;
        const cachedData = localStorage.getItem(CACHE_KEY);

        if (cachedData) {
            // Parse dữ liệu từ string về object
            const parsedData = JSON.parse(cachedData);

            // (Tùy chọn) Kiểm tra thời hạn cache. Ví dụ: 1 giờ
            const now = new Date().getTime();
            if (now - parsedData.timestamp < 3600 * 1000) {
                console.log("Load danh sách ảnh từ LocalStorage (Không tốn lượt gọi API)");
                // Cập nhật biến global để code khác dùng
                galleryCache = parsedData.files;
                return parsedData.files;
            }
        }

        // 2. NẾU KHÔNG CÓ CACHE HOẶC HẾT HẠN -> GỌI API
        try {
            console.log("Gọi API Vercel lấy danh sách...");
            const apiUrl = `${VERCEL_BASE_URL}/api/gallery?ext=${ext}`;
            const res = await fetch(apiUrl);

            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();

            if (json.success && json.files.length > 0) {
                // Cập nhật biến global
                galleryCache = json.files;

                // 3. LƯU VÀO LOCAL STORAGE (Kèm thời gian hiện tại)
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    files: json.files,
                    timestamp: new Date().getTime()
                }));

                return json.files;
            }
            return [];
        } catch (e) {
            console.error("Lỗi tải ảnh:", e);
            return [];
        }
    };

    // --- HÀM 2: MỞ MODAL XEM CHI TIẾT (Thay thế Turn.js) ---
    /*
  * Mở View chi tiết ảnh (Full Screen)
  * @param {number} startIndex - Index của ảnh trong mảng allImagesUrls
  * @returns {void}
  *
    const openDetailModal = (startIndex) => {
        // 1. Dọn dẹp và chuẩn bị Thumbnail
        const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
        const thumbContainer = document.getElementById('detail-thumbnails');
        thumbContainer.innerHTML = '';

        // Gắn sự kiện đóng để quay lại Album Lật
        $(detailModal.element).off('hidden.bs.modal');
        $(detailModal.element).on('hidden.bs.modal', function () {
            bs.modal('albumModal').show();
        });

        // 2. Dựng thanh Thumbnail
        allImagesUrls.forEach((src, index) => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.className = 'rounded-3 shadow-sm cursor-pointer mx-1';
            thumb.style.width = '60px';
            thumb.style.height = '60px';
            thumb.style.objectFit = 'cover';
            thumb.onclick = () => showImageDetail(index);
            thumb.oncontextmenu = (e) => e.preventDefault(); // Cấm tải trên thumbnail
            thumbContainer.appendChild(thumb);
        });

        // 3. Mở Modal và hiển thị ảnh đầu tiên
        bs.modal('albumModal').hide();
        detailModal.show(1);

        // Gán sự kiện cho các nút điều hướng (đã nằm trong HTML)

        // Hiển thị ảnh chi tiết tại index đã click
        showImageDetail(startIndex);
    };*/

    // --- DETAIL MODAL ---
    let detailModalInstance = null; // Lưu instance để tái sử dụng
    let detailImage = null;
    let thumbs = null;


    /**
     * Mở modal xem chi tiết ảnh
     * @param {number} startIndex - index ảnh trong allImagesUrls
     */
    function openDetailModal(startIndex = 0) {
        // Nếu chưa có cache ảnh, tải lại (phòng hờ)
        if (!galleryCache && typeof fetchGalleryImages === 'function') {
            fetchGalleryImages().then(() => openDetailModal(startIndex));
            return;
        } else if (!allImagesUrls || allImagesUrls.length === 0) {
            // Fallback nếu dùng biến cũ
            if (typeof allImagesUrls !== 'undefined' && allImagesUrls.length > 0) {
                // ok
            } else {
                return;
            }
        }

        // Đồng bộ biến cache nếu cần (tùy code cũ/mới của bạn)
        const detailModalEl = document.getElementById('detailModal');
        if (detailModalEl.style.display = "none") {
            detailModalEl.style.display = "block";
        }
        detailModalInstance = new bootstrap.Modal(detailModalEl);

        const thumbContainer = document.getElementById('detail-thumbnails');
        detailImage = document.getElementById('detail-fullscreen-image');
        // 1. KHỞI TẠO HOẶC LẤY INSTANCE
        // Kiểm tra xem Bootstrap đã gắn instance vào element chưa
        if (!detailModalInstance) {
            detailModalInstance = bootstrap.Modal.getInstance(detailModalEl) || new bootstrap.Modal(detailModalEl);
        }

        // 2. RENDER THUMBNAILS (Chỉ làm 1 lần)
        if (!thumbContainer.dataset.rendered) {
            thumbContainer.innerHTML = '';

            allImagesUrls.forEach((src, index) => {
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.className = 'rounded-3 shadow-sm cursor-pointer mx-1';
                thumb.style.cssText = `
                width: 60px;
                height: 60px;
                object-fit: cover;
                opacity: 0.6;
            `;
                thumb.onclick = () => showImageDetail(index);
                thumb.oncontextmenu = (e) => e.preventDefault();
                thumbContainer.appendChild(thumb);
            });

            thumbContainer.dataset.rendered = "1";
        }

        thumbs = thumbContainer.querySelectorAll("img");

        // ====== 2) Hiển thị ảnh chi tiết ======

        // Khởi tạo hình đầu tiên
        showImageDetail(startIndex);

        // 4. CHỈ SHOW MODAL NẾU NÓ CHƯA HIỆN
        // Kiểm tra class 'show' để biết modal đang mở hay chưa
        if (!detailModalEl.classList.contains('show')) {
            detailModalInstance.show();
        }

        // ====== 3) Zoom + Swipe ======
        let scale = 1,
            moveX = 0,
            moveY = 0,
            startDist = null,
            startX = 0,
            startY = 0,
            touchStartX = 0;

        detailImage.style.transition = 'transform 0.2s ease-out';
        detailImage.style.transform = 'scale(1) translate(0,0)';

        detailImage.ontouchstart = (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                startDist = Math.hypot(dx, dy);
            } else if (e.touches.length === 1 && scale > 1) {
                startX = e.touches[0].pageX - moveX;
                startY = e.touches[0].pageY - moveY;
            }
            touchStartX = e.touches[0].clientX;
        };

        detailImage.ontouchmove = (e) => {
            e.preventDefault();

            if (e.touches.length === 2 && startDist) {
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                const dist = Math.hypot(dx, dy);

                scale = Math.min(4, Math.max(1, scale * (dist / startDist)));
                detailImage.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;

                startDist = dist;
            }
            else if (e.touches.length === 1 && scale > 1) {
                moveX = e.touches[0].pageX - startX;
                moveY = e.touches[0].pageY - startY;
                detailImage.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;
            }
        };

        detailImage.ontouchend = (e) => {
            startDist = null;

            // Nếu không zoom => xử lý swipe trái phải
            if (scale === 1 && e.changedTouches.length === 1) {
                const dx = e.changedTouches[0].clientX - touchStartX;

                if (Math.abs(dx) > 50) {
                    navigateDetail(dx < 0 ? 1 : -1);
                }
            }
        };

        // ====== 4) Hiển thị modal ======
    }

    function showImageDetail(index) {
        if (index < 0 || index >= allImagesUrls.length) return;

        currentDetailIndex = index;

        detailImage.src = allImagesUrls[index];
        detailImage.oncontextmenu = (e) => e.preventDefault();

        // Highlight thumbnail
        thumbs.forEach((img, i) => {
            img.style.border = i === index ? '3px solid #ff4081' : 'none';
            img.style.opacity = i === index ? 1 : 0.6;
        });

    }


    // Prev/Next ảnh trong modal
    function navigateDetail(direction) {
        const total = allImagesUrls.length;
        if (total === 0) return; // Không có ảnh thì thoát

        // Tính index mới theo vòng lặp
        const newIndex = (currentDetailIndex + direction + total) % total;

        openDetailModal(newIndex);
    }

    // --- PAGEFLIP ALBUM ---
    async function initPageFlipAlbum(ext = 'webp') {
        const modalElement = document.getElementById('albumModal');
        let bookEl = document.getElementById('book'); // Container cố định
        // --- ĐOẠN SỬA ĐỔI: NẾU ĐÃ CÓ SÁCH THÌ KHÔNG TẠO LẠI ---
        if (pageFlipInstance) {
            // Chỉ cần show modal lên là xong
            const bsModal = new bootstrap.Modal(modalElement);
            bsModal.show();
            return; // Dừng hàm tại đây
        }

        if (!bookEl) {
            const modalBody = modalElement.querySelector('.modal-body');
            if (!modalBody) return console.error('modal-body không tồn tại!');
            modalBody.insertAdjacentHTML('afterbegin', `<div id="book" style="display:none"></div>`);
            bookEl = document.getElementById('book');
        }

        // 1. Tải ảnh
        const images = await fetchGalleryImages(ext);
        allImagesUrls = images;
        if (!images.length) return;


        // Destroy instance cũ
        if (pageFlipInstance) {
            pageFlipInstance.destroy();
            pageFlipInstance = null;
        }

        bookEl.innerHTML = '';
        bookEl.style.display = 'block';

        // 2. Hiển thị Modal trước để tính toán kích thước chính xác
        const bsModal = new bootstrap.Modal(modalElement);
        bsModal.show();

        // 3. Xử lý DOM & Kích thước sau khi modal hiện
        modalElement.addEventListener('shown.bs.modal', () => {
            // Nếu instance đã tồn tại thì không init lại (trừ khi data đổi)
            if (pageFlipInstance) return;

            bookEl.style.display = 'block';
            bookEl.innerHTML = ''; // Clear cũ

            // Tính toán kích thước responsive
            const screenWidth = window.innerWidth;
            // Giới hạn max width hợp lý, trừ đi padding của modal
            const finalWidth = Math.min(1000, screenWidth * 0.95);
            const finalHeight = finalWidth / BOOK_RATIO;
            const singlePageWidth = finalWidth / 2;

            // Render HTML string cho các trang
            const pageElements = allImagesUrls.map((url, index) => {
                const page = document.createElement('div');
                page.className = 'my-page';
                page.dataset.pageIndex = index;
                if (index === 0 || index === allImagesUrls.length - 1) page.dataset.density = 'hard';
                page.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
                return page;
            })

            //bookEl.innerHTML = pagesHTML;

            // Khởi tạo PageFlip
            pageFlipInstance = new St.PageFlip(bookEl, {
                width: singlePageWidth,
                height: finalHeight,
                size: 'fixed',
                drawShadow: true,
                flippingTime: 800, // Tăng nhẹ để mượt hơn
                showCover: true,
                usePortrait: true, // Tự động chuyển 1 trang trên mobile
                startZIndex: 1,
                maxShadowOpacity: 0.5,
                showPageCorners: true,
                // QUAN TRỌNG: Để thư viện tự xử lý click để lật trang
                disableFlipByClick: false
            });
            pageFlipInstance.loadFromHTML(pageElements);

            function attachPageClickEvents() {
                document.querySelectorAll(".my-page").forEach((page) => {
                    if (page.dataset.hasHandlers) return;
                    page.dataset.hasHandlers = "1";

                    const pageIndex = parseInt(page.dataset.pageIndex);

                    let clickTimer = null;

                    // --------------------------
                    // 1) CLICK (flip) – Laptop
                    // --------------------------
                    page.addEventListener("click", (e) => {
                        // Nếu click chuẩn bị thành dblclick → chặn flip
                        if (clickTimer !== null) {
                            clearTimeout(clickTimer);
                            clickTimer = null;
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            return;
                        }

                        // Chờ xem có dblclick hay không
                        clickTimer = setTimeout(() => {
                            clickTimer = null;

                            // Không ngăn flip nếu chỉ click 1 lần
                            // Do not handle anything here, PageFlip will flip normally

                        }, 1000);
                    });


                    // --------------------------
                    // 2) DBLCLICK → mở modal
                    // --------------------------
                    page.addEventListener("dblclick", (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();

                        // Đây là dblclick thật → chặn flip & mở modal
                        if (clickTimer !== null) {
                            clearTimeout(clickTimer);
                            clickTimer = null;
                        }

                        openDetailModal(pageIndex);
                    });


                    // --------------------------
                    // 3) MOBILE DOUBLE TAP LOGIC
                    // --------------------------
                    let lastTapTime = 0;
                    let tapTimer = null;

                    page.addEventListener("touchend", (e) => {
                        const now = Date.now();
                        const timeDiff = now - lastTapTime;

                        // Nếu double tap (≤ 500ms)
                        if (timeDiff > 0 && timeDiff < 500) {
                            // Chặn flip
                            e.preventDefault();
                            e.stopImmediatePropagation();

                            // Hủy timer single-tap
                            if (tapTimer) {
                                clearTimeout(tapTimer);
                                tapTimer = null;
                            }

                            openDetailModal(pageIndex);
                            lastTapTime = 0; // reset
                            return;
                        }

                        // Chưa chắc là single tap → chờ xem có tap 2 hay không
                        lastTapTime = now;

                        tapTimer = setTimeout(() => {
                            tapTimer = null;

                            // Đây là single tap → để PageFlip flip tự nhiên
                            // Không cần code thêm gì ở đây
                            // PageFlip sẽ flip vì nó bắt được click/touch riêng của nó

                        }, 500);
                    });
                });
            }

            // Gắn khi init
            pageFlipInstance.on("init", attachPageClickEvents);

            // Gắn lại khi lật trang (DOM thay đổi)
            pageFlipInstance.on("flip", attachPageClickEvents);

            // Nếu bạn dùng changeState
            pageFlipInstance.on("changeState", attachPageClickEvents);


            // dblclick mở modal detail
            // 6c. Chặn dblclick PageFlip, dùng riêng mở modal detail 
            bookEl.addEventListener("dblclick", (e) => {
                attachPageClickEvents();
            }); // capture = true


            // --- EVENT DELEGATION (Xử lý sự kiện tập trung) ---
            //setupAlbumEvents(bookEl);

        }, { once: true });
    }

    // Xử lý sự kiện click/tap cho Album (Tách riêng cho gọn)
    function setupAlbumEvents(bookElement) {
        let lastTap = 0;

        // Xử lý Double Click (Desktop) & Double Tap (Mobile)
        // Thay vì can thiệp vào từng page, ta bắt sự kiện trên wrapper cha
        const handleAction = (e) => {
            let pageEl = e.target.closest(".my-page") || e.target.querySelector(".my-page");
            if (!pageEl) {
                console.log('pageEl not found', e.target);
                return;
            }

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            // Logic phát hiện Double Tap/Click (khoảng cách < 300ms)
            // Hoặc nếu click vào icon zoom
            const isZoomIcon = e.target.closest('.zoom-indicator');

            if ((tapLength < 300 && tapLength > 0) || isZoomIcon) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(pageEl.dataset.pageIndex);
                openDetailModal(index);
                lastTap = 0; // Reset
                return;
            }
            lastTap = currentTime;
        };

        // Dùng 'click' cho desktop và 'touchend' cho mobile (để bắt double tap)
        bookElement.addEventListener('click', handleAction);
        bookElement.addEventListener('touchend', handleAction);
    }

    // --- ĐÓNG ALBUM (CLEANUP) ---
    function closeDetailModal2() {
        const albumModalEl = document.getElementById("albumModal");
        const bookEl = document.getElementById("book");

        const modalInstance = bootstrap.Modal.getInstance(albumModalEl);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            // Fallback nếu không lấy được instance
            albumModalEl.classList.remove('show');
            albumModalEl.style.display = 'none';
            albumModalEl.removeAttribute('role');
            albumModalEl.removeAttribute('aria-modal');
        }

        // 2. Hủy instance PageFlip & xóa DOM
        // (Làm cái này ngay cũng được, hoặc đợi setTimeout cũng được)


        // 3. Gọi hàm Force Remove Backdrop sau 300ms (thời gian animation của modal)
        setTimeout(() => {
            forceRemoveBackdrop();
        }, 300);
    }

    // --- Detail modal với swipe + pinch zoom ---
    function openDetailModalSwipeZoom(index) {
        const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
        const imgEl = document.getElementById('detail-fullscreen-image');
        imgEl.src = allImagesUrls[index];

        let currentIndex = index;
        let scale = 1, moveX = 0, moveY = 0;
        let startDist = null, startX = 0, startY = 0;

        imgEl.style.transform = 'scale(1) translate(0,0)';
        imgEl.style.transition = 'transform 0.2s ease-out';

        detailModal.show();

        // Pinch & drag
        imgEl.ontouchstart = (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                startDist = Math.hypot(dx, dy);
            } else if (e.touches.length === 1 && scale > 1) {
                startX = e.touches[0].pageX - moveX;
                startY = e.touches[0].pageY - moveY;
            }
        };

        imgEl.ontouchmove = (e) => {
            e.preventDefault();
            if (e.touches.length === 2 && startDist) {
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                const dist = Math.hypot(dx, dy);
                scale *= dist / startDist;
                scale = Math.max(1, Math.min(scale, 4));
                imgEl.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;
                startDist = dist;
            } else if (e.touches.length === 1 && scale > 1) {
                moveX = e.touches[0].pageX - startX;
                moveY = e.touches[0].pageY - startY;
                imgEl.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;
            }
        };

        imgEl.ontouchend = () => { startDist = null; };

        // Swipe next/prev ảnh
        let touchStartX = 0;
        imgEl.addEventListener('touchstart', e => { if (e.touches.length === 1) touchStartX = e.touches[0].clientX; });
        imgEl.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50) {
                if (dx < 0) currentIndex = Math.min(currentIndex + 1, allImagesUrls.length - 1);
                else currentIndex = Math.max(currentIndex - 1, 0);
                imgEl.src = allImagesUrls[currentIndex];
                scale = 1; moveX = 0; moveY = 0;
                imgEl.style.transform = 'scale(1) translate(0,0)';
            }
        });
    }

    function forceRemoveBackdrop() {
        // 1. Xóa tất cả các lớp mờ đen (backdrop)
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        // 2. MỞ KHÓA SCROLL CHO BODY (QUAN TRỌNG)
        // Thay vì gán rỗng, hãy gán 'auto' hoặc 'visible' để ép trình duyệt cho phép cuộn
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto'; // Phòng trường hợp body bị set height 100%
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '0px';

        // 3. MỞ KHÓA SCROLL CHO HTML (Phòng hờ)
        // Một số trình duyệt hoặc thư viện mobile set overflow trên cả thẻ html
        //document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
    }
    //KẾT THÚC CODE PHẦN PAGE-TURNING ANIMATION CHO ẢNH THƯ VIỆN ---

    /* --- QUẢN LÝ HIỆU ỨNG CUỘN (SCROLL REVEAL) --- */
    function initScrollObserver() {
        // Chọn tất cả thành phần cần hiệu ứng: Center Section & Zigzag Rows
        const items = document.querySelectorAll('.timeline-section-center, .timeline-row');

        const observerOptions = {
            root: document.getElementById('storyTimelineModal'), // Quan sát trong Modal
            threshold: 0.15, // Hiện 15% là kích hoạt
            rootMargin: "0px 0px -50px 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // observer.unobserve(entry.target); // Bỏ comment nếu muốn chỉ chạy 1 lần
                }
            });
        }, observerOptions);

        items.forEach(item => {
            observer.observe(item);
        });
    }

    /* --- QUẢN LÝ MODAL TIMELINE --- */
    function openStoryTimeline() {
        const modal = document.getElementById('storyTimelineModal');
        modal.classList.add('active');

        document.body.classList.add('modal-open'); // Khóa cuộn trang chủ

        // Kích hoạt Observer sau khi modal mở để tính toán vị trí đúng
        setTimeout(() => {
            initScrollObserver();
        }, 300);
    }

    function closeStoryTimeline() {
        const modal = document.getElementById('storyTimelineModal');
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    /* --- QUẢN LÝ VIDEO PLAYER --- */
    function playVideo(videoId, title) {
        // 1. GỌI HÀM TẠM DỪNG NHẠC NỀN
        if (window.musicPlayer && typeof window.musicPlayer.pauseForVideo === 'function') {
            window.musicPlayer.pauseForVideo();
        }
        const videoModal = document.getElementById('videoPlayerModal');
        const container = document.getElementById('youtubePlayerContainer');
        const titleEl = document.getElementById('playerTitle');

        // Set tiêu đề
        if (titleEl) titleEl.innerText = title;

        // Tạo iframe Youtube (Autoplay)
        const iframeHtml = `
        <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}&loop=1&playlist=${videoId}" 
            title="YouTube video player" 
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen 
            class="w-100 h-100 absolute top-0 left-0">
        </iframe>
    `;

        container.innerHTML = iframeHtml;
        videoModal.classList.add('active');

        document.body.classList.add('modal-open');
    }

    function closeVideoPlayer() {
        const videoModal = document.getElementById('videoPlayerModal');
        const container = document.getElementById('youtubePlayerContainer');

        videoModal.classList.remove('active');

        // Xóa iframe sau khi đóng để tắt tiếng
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);

        // 1. GỌI HÀM TIẾP TỤC NHẠC NỀN
        if (window.musicPlayer && typeof window.musicPlayer.resumeAfterVideo === 'function') {
            window.musicPlayer.resumeAfterVideo();
        }

        const storyModal = document.getElementById('storyTimelineModal');
        if (!storyModal.classList.contains('active')) {
            document.body.classList.remove('modal-open');
        }
    }

    /* --- PHÍM TẮT (ESC) --- */
    document.addEventListener('keydown', function (event) {
        if (event.key === "Escape") {
            if (document.getElementById('videoPlayerModal').classList.contains('active')) {
                closeVideoPlayer();
            } else if (document.getElementById('storyTimelineModal').classList.contains('active')) {
                closeStoryTimeline();
            }
        }
    });

    /**
     * @returns {object}
     */
    const init = () => {
        theme.init();
        session.init();

        if (session.isAdmin()) {
            storage('user').clear();
            storage('owns').clear();
            storage('likes').clear();
            storage('session').clear();
            storage('comment').clear();
        }

        window.addEventListener('load', () => {
            pool.init(pageLoaded, [
                'image',
                'video',
                'audio',
                'libs',
                'gif',
            ]);
            // CHẠY HÀM TẠO LỊCH CỦA CHÚNG TA SAU KHI MỌI THỨ ĐÃ TẢI XONG
            initializeCalendarLinks();
            //setupParticleControls();
        });

        window.navigateDetail = function (direction) {
            const total = allImagesUrls.length;
            if (!total) return;
            const newIndex = (currentDetailIndex + direction + total) % total;
            // nếu modal đã mở, cập nhật nội dung thay vì reopen
            const thumbContainer = document.getElementById('detail-thumbnails');
            if (thumbContainer && thumbContainer.dataset.rendered) {
                // gọi trực tiếp hàm showImageDetail (nếu ở scope) hoặc implement helper
                showImageDetail(newIndex); // cần đưa showImageDetail ra scope ngoài openDetailModal
            } else {
                openDetailModal(newIndex);
            }
        };

        window.closeDetailModal = function () {
            const detailModalEl = document.getElementById("detailModal");
            const imgEl = document.getElementById("detail-fullscreen-image");

            // 2. Đóng modal detail


            if (detailModalEl) {
                //detailModalEl.classList.remove("show");
                detailModalEl.style.display = "none";
            }

            // 2. Reset Zoom ảnh (quan trọng để lần sau mở không bị lệch)
            //const imgEl = document.getElementById("detail-fullscreen-image");
            if (imgEl) {
                imgEl.style.transform = "scale(1) translate(0,0)";
            }

            // 3. Xử lý backdrop (Fix lỗi màn hình đen bạn gặp trước đó)
            setTimeout(() => {
                const albumModal = document.getElementById('albumModal');
                // Nếu album modal không mở thì mới xóa backdrop
                if (!albumModal || !albumModal.classList.contains('show')) {
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                }
            }, 300);

            // Nếu muốn khi đóng detail, album tự lật đến trang đó:
            if (pageFlipInstance) {
                // Cần setTimeout nhỏ để đợi modal album hiển thị lại
                setTimeout(() => {
                    try { pageFlipInstance.flip(currentDetailIndex); } catch (e) { }
                }, 300);
            }
        }

        return {
            util,
            theme,
            comment,
            guest: {
                open,
                modal,
                showStory,
                closeInformation,
                openAlbum: initPageFlipAlbum, // Gán hàm khởi tạo Album vào API công khai
                openDetail: openDetailModalSwipeZoom, // Export hàm mở chi tiết
                closeDetailModal2,
                openStoryTimeline,
                openDetailModal,
                closeStoryTimeline,
                closeVideoPlayer,
                playVideo
                //navigateDetail,
            },
        };
    };

    return {
        init,
    };
})();