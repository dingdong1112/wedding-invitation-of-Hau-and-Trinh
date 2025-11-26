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

export const guest = (() => {

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
        button.disabled = true;
        document.body.scrollIntoView({ behavior: 'instant' });
        document.getElementById('root').classList.remove('opacity-0');

        if (theme.isAutoMode()) {
            document.getElementById('button-theme').classList.remove('d-none');
        }

        slide();
        theme.spyTop();

        //confetti.basicAnimation();
        //util.timeOut(confetti.openAnimation, 1500);
        if (typeof window.confetti === 'function') {
            window.confetti();
            util.timeOut(window.confetti, 1500);
        }

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
        animateSvg();
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
    const pageLoaded = () => {
        lang.init();
        offline.init();
        comment.init();
        progress.init();

        config = storage('config');
        information = storage('information');

        const vid = video.init();
        const img = image.init();
        const aud = audio.init();
        const lib = loaderLibs();
        const token = document.body.getAttribute('data-key');
        const params = new URLSearchParams(window.location.search);

        window.addEventListener('resize', util.debounce(slide));
        document.addEventListener('undangan.progress.done', () => booting());
        document.addEventListener('hide.bs.modal', () => document.activeElement?.blur());
        document.getElementById('button-modal-download').addEventListener('click', (e) => {
            img.download(e.currentTarget.getAttribute('data-src'));
        });

        if (!token || token.length <= 0) {
            document.getElementById('comment')?.remove();
            document.querySelector('a.nav-link[href="#comment"]')?.closest('li.nav-item')?.remove();

            vid.load();
            img.load();
            aud.load();
            lib.load({ confetti: document.body.getAttribute('data-confetti') === 'true' });
        }

        if (token && token.length > 0) {
            // add 2 progress for config and comment.
            // before img.load();
            progress.add();
            progress.add();

            // if don't have data-src.
            if (!img.hasDataSrc()) {
                img.load();
            }

            session.guest(params.get('k') ?? token).then(({ data }) => {
                document.dispatchEvent(new Event('undangan.session'));
                progress.complete('config');

                if (img.hasDataSrc()) {
                    img.load();
                }

                vid.load();
                aud.load();
                lib.load({ confetti: data.is_confetti_animation });

                comment.show()
                    .then(() => progress.complete('comment'))
                    .catch(() => progress.invalid('comment'));

            }).catch(() => progress.invalid('config'));
        }
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

        if (!toggleButton) return;

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
            const heartPathString = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

            let confettiOptions = {
                particleCount: density / 5, // Bắn một lượng nhỏ mỗi lần
                angle: 90,
                spread: 180,
                origin: { x: Math.random(), y: Math.random() - 0.2 },
                scalar: size,
                flat: true,
                gravity: 0.5,
                drift: Math.random() * 0.5 - 0.25,
                disableForReducedMotion: true,

                zIndex: 2000 
            };

            const emojiVariation = '\uFE0F';

            switch (shape) {
                case 'hearts':
                    confettiOptions.symbols = ['❤️' + emojiVariation];
                    confettiOptions.colors = undefined;
                    confettiOptions.scalar = size * 1.5;
                    confettiOptions.gravity = 0.3;
                    break;
                case 'snow':
                    confettiOptions.symbols = ['❄️' + emojiVariation];
                    confettiOptions.colors = undefined;
                    confettiOptions.scalar = size * 1.2;
                    confettiOptions.drift = Math.random() * 0.7 - 0.35;
                    break;
                case 'stars':
                    confettiOptions.symbols = ['✨' + emojiVariation];
                    confettiOptions.colors = undefined;
                    confettiOptions.scalar = size * 1.3;
                    break;

                case 'svg-heart': // --- CODE MỚI CHO TRÁI TIM VẼ ---
                    const customHeart = window.confetti.shapeFromPath({
                        path: heartPathString
                    });
                    confettiOptions.shapes = [customHeart];
                    // Chọn bộ màu hồng/đỏ cho trái tim
                    confettiOptions.colors = ['#FFC0CB', '#FF69B4', '#FF1493', '#C71585', '#DC143C'];
                    confettiOptions.scalar = size * 2; // SVG thường bé nên cần nhân to lên
                    break;

                default: // confetti (hình vuông)
                    confettiOptions.shapes = ['square'];
                    confettiOptions.colors = undefined;
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
            setupParticleControls();
        });

        return {
            util,
            theme,
            comment,
            guest: {
                open,
                modal,
                showStory,
                closeInformation,
            },
        };
    };

    return {
        init,
    };
})();