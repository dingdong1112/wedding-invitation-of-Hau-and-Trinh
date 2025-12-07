import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { cache } from '../../connection/cache.js';
import { storage } from '../../common/storage.js'; // Thêm import storage

export const audio = (() => {

    // --- CẤU HÌNH PLAYLIST (BẠN THÊM BÀI HÁT VÀO ĐÂY) ---
    const playlist = [
        { title: "Beautiful In White - Shane Filan", src: "./assets/music/Beautiful In White - Shane Filan.mp3" },
        { title: "A Thousand Years - Christina Perri", src: "./assets/music/A Thousand Years - Christina Perri.mp3" },
        { title: "I Do - 911", src: "./assets/music/I Do - 911.mp3" },
        { title: "Marry You - Bruno Mars", src: "./assets/music/Marry You - Bruno Mars.mp3" },
        { title: "Perfect - Ed Sheeran", src: "./assets/music/Perfect - Ed Sheeran.mp3" },
        { title: "Sugar - Maroon 5", src: "./assets/music/Sugar - Maroon 5.mp3" },
        { title: "Until You - Shayne Ward", src: "./assets/music/Until You - Shayne Ward.mp3" },
        { title: "Cưới nhau đi - Bùi Anh Tuấn X Hiền Hồ", src: "./assets/music/Cuoi nhau di - Yes I Do - Bui Anh Tuan x Hien Ho.mp3" },
        { title: "Cưới thôi - Masew x Masiu x B Ray x TAP", src: "./assets/music/Cuoi thoi - Masew x Masiu x B Ray x TAP.mp3" },
        { title: "GGYDVDBE - Phan Mạnh Quỳnh", src: "./assets/music/Gap go, yeu duong va duoc ben em - Phan Manh Quynh.mp3" },
        { title: "Hơn cả yêu - Đức Phúc", src: "./assets/music/Hon ca yeu - Duc Phuc.mp3" },
        { title: "Một nhà - Da Lab", src: "./assets/music/Mot nha - Da Lab.mp3" },
        { title: "Rồi tới luôn - Nal", src: "./assets/music/Roi toi luon - Nal.mp3" },
        // Thêm bài hát khác: { title: "Tên bài", src: "Link file mp3" },
    ];

    let audioEl = new Audio();
    // Cấu hình CORS để Web Audio API hoạt động không bị lỗi bảo mật
    audioEl.crossOrigin = "anonymous";

    let audioCtx = null;
    let gainNode = null;
    let source = null;

    let currentIndex = 0;
    let isPlaying = false;
    let isPanelOpen = false;

    let isShuffle = false;
    let loopMode = 1;
    let wasPlayingBeforeVideo = false;

    // Các Element giao diện
    const els = {
        widget: null, toggleBtn: null, panel: null,
        playBtn: null, title: null, playlistUl: null,
        playlistContainer: null, vinyl: null,
        shuffleBtn: null, loopBtn: null
    };

    const pauseForVideo = () => {
        if (isPlaying) {
            wasPlayingBeforeVideo = true; // Ghi nhớ là nhạc đang bật
            pause(); // Tạm dừng nhạc
        } else {
            wasPlayingBeforeVideo = false; // Nhạc đang tắt thì thôi
        }
    };

    // 3. THÊM HÀM MỚI: TIẾP TỤC SAU VIDEO
    const resumeAfterVideo = () => {
        // Chỉ mở lại nếu trước đó nhạc ĐANG BẬT
        if (wasPlayingBeforeVideo) {
            play();
        }
    };

    // --- HÀM ĐÓNG BẢNG NHẠC ---
    const closePanel = () => {
        if (isPanelOpen && els.panel && els.toggleBtn) {
            isPanelOpen = false;
            els.panel.classList.add('d-none');
            if (isPlaying) els.toggleBtn.classList.add('spin-slow');
            els.toggleBtn.innerHTML = '<i class="fa-solid fa-compact-disc"></i>';
        }
    };

    // --- KHỞI TẠO WEB AUDIO API (QUAN TRỌNG) ---
    // Phải gọi hàm này sau khi người dùng tương tác (click) thì trình duyệt mới cho phép
    const initAudioContext = () => {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            // Tạo bộ khuếch đại (GainNode)
            gainNode = audioCtx.createGain();
            // Kết nối: Audio Element -> Khuếch đại -> Loa
            source = audioCtx.createMediaElementSource(audioEl);
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Set âm lượng mặc định (0.8)
            gainNode.gain.value = 0.6;
        }

        // Resume nếu bị trình duyệt treo
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };

    const init = () => {
        progress.add();

        // 1. KIỂM TRA CONFIG TRƯỚC
        // Lưu ý: Phải đảm bảo file này đã import { storage } from '../../common/storage.js';
        const config = storage('config');

        // Mặc định là TRUE (nếu chưa có config thì vẫn hiện nhạc)
        const isMusicEnabled = config.get('music_enabled') !== false;

        // Lấy Widget ngay đầu để xử lý ẩn
        els.widget = document.getElementById('music-player-container');

        // Map các element còn lại (Bỏ dòng els.widget đi vì đã lấy ở trên rồi)
        els.toggleBtn = document.getElementById('music-toggle-btn');
        els.panel = document.getElementById('music-panel');
        els.playBtn = document.getElementById('btn-play-pause');
        els.title = document.getElementById('current-song-title');
        els.playlistUl = document.getElementById('playlist-ul');
        els.playlistContainer = document.getElementById('playlist-container');
        els.vinyl = document.getElementById('vinyl-container');
        els.shuffleBtn = document.getElementById('btn-shuffle');
        els.loopBtn = document.getElementById('btn-loop');

        // Sự kiện click nút Toggle
        if (els.toggleBtn) {
            els.toggleBtn.addEventListener('click', () => {
                if (!isPanelOpen) {
                    isPanelOpen = true;
                    els.panel.classList.remove('d-none');
                    els.toggleBtn.classList.remove('spin-slow');
                    els.toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

                    // Đóng bảng pháo hoa nếu đang mở (Tương tác chéo)
                    const particlePanel = document.getElementById('particle-controls');
                    if (particlePanel) particlePanel.classList.remove('show');
                } else {
                    closePanel();
                }
            });
        }

        // Xử lý Playlist mặc định
        const defaultUrl = document.body.getAttribute('data-audio');
        if (defaultUrl && playlist.length === 0) {
            playlist.push({ title: "Nhạc nền", src: defaultUrl });
        }

        // Sự kiện hết bài (Next / Loop)
        audioEl.addEventListener('ended', () => {
            if (loopMode === 2) {
                audioEl.currentTime = 0;
                play();
            } else {
                next(true);
            }
        });

        // Render giao diện lần đầu
        renderPlaylist();
        // --- TRƯỜNG HỢP TẮT NHẠC ---
        if (!isMusicEnabled) {
            //console.log("Music is disabled by Admin.");
            //if (els.widget) els.widget.classList.add('d-none'); // Ẩn giao diện
            //progress.complete('audio'); // Báo load xong để không kẹt Loading

            return { load: () => { } }; // THOÁT NGAY LẬP TỨC
        }

        // --- TRƯỜNG HỢP BẬT NHẠC (Chạy tiếp xuống dưới) ---               
        loadTrack(0);
        updateModeButtons();

        progress.complete('audio');

        // Sự kiện mở thiệp -> Tự động phát
        document.addEventListener('undangan.open', () => {
            els.widget?.classList.remove('d-none');
            try {
                initAudioContext(); // Kích hoạt Web Audio API
                play();
            } catch (e) { console.log("Autoplay blocked", e); }
        });

        return { load: () => { } };
    };

    const loadTrack = (index) => {
        currentIndex = index;
        audioEl.src = playlist[currentIndex].src;
        audioEl.load();
        if (els.title) els.title.innerText = playlist[currentIndex].title;
        updatePlaylistUI();
    };

    const play = () => {
        // Đảm bảo AudioContext đã chạy trước khi Play
        initAudioContext();

        audioEl.play().then(() => {
            isPlaying = true;
            updatePlayButton();
            updateVinylState();
        }).catch(e => console.log("Autoplay blocked or CORS issue"));
    };

    const pause = () => {
        audioEl.pause();
        isPlaying = false;
        updatePlayButton();
        updateVinylState();
    };

    const toggle = () => isPlaying ? pause() : play();

    const next = (isAuto = false) => {
        if (isAuto && loopMode === 0 && currentIndex === playlist.length - 1 && !isShuffle) {
            pause();
            return;
        }
        if (isShuffle) {
            let randomIndex = currentIndex;
            if (playlist.length > 1) {
                while (randomIndex === currentIndex) {
                    randomIndex = Math.floor(Math.random() * playlist.length);
                }
            }
            loadTrack(randomIndex);
        } else {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= playlist.length) nextIndex = 0;
            loadTrack(nextIndex);
        }
        play();
    };

    const prev = () => {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;
        loadTrack(prevIndex);
        play();
    };

    // --- HÀM SET VOLUME MỚI (DÙNG GAIN NODE) ---
    const setVolume = (val) => {
        const volume = parseFloat(val);
        // Nếu đã có AudioContext (Web Audio API)
        if (gainNode) {
            // GainNode cho phép giá trị > 1 (Khuếch đại)
            // Ví dụ: 1.2 là 120%
            gainNode.gain.value = volume;
        } else {
            // Fallback cho trường hợp chưa init (hiếm gặp)
            // Audio Tag thường chỉ max là 1
            audioEl.volume = Math.min(volume, 1);
        }
    };

    // (Các hàm toggleShuffle, toggleLoop, updateModeButtons... Giữ nguyên như cũ)
    const toggleShuffle = () => {
        isShuffle = !isShuffle;
        updateModeButtons();
    };

    const toggleLoop = () => {
        loopMode++;
        if (loopMode > 2) loopMode = 0;
        updateModeButtons();
    };

    const updateModeButtons = () => {
        if (!els.shuffleBtn || !els.loopBtn) return;
        if (isShuffle) els.shuffleBtn.classList.add('active');
        else els.shuffleBtn.classList.remove('active');
        els.loopBtn.className = 'btn-control small';
        if (loopMode === 1) els.loopBtn.classList.add('active');
        else if (loopMode === 2) els.loopBtn.classList.add('active', 'loop-one');
    };

    const togglePlaylist = () => els.playlistContainer.classList.toggle('d-none');

    const updatePlayButton = () => {
        if (!els.playBtn) return;
        if (isPlaying) {
            els.playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            if (!isPanelOpen) els.toggleBtn?.classList.add('spin-slow');
        } else {
            els.playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            els.toggleBtn?.classList.remove('spin-slow');
        }
    };

    const updateVinylState = () => {
        if (!els.vinyl) return;
        isPlaying ? els.vinyl.classList.add('is-playing') : els.vinyl.classList.remove('is-playing');
    };

    const renderPlaylist = () => {
        if (!els.playlistUl) return;
        els.playlistUl.innerHTML = '';
        playlist.forEach((track, i) => {
            const li = document.createElement('li');
            li.className = 'list-group-item playlist-item';
            li.innerText = track.title;
            li.onclick = () => { loadTrack(i); play(); };
            els.playlistUl.appendChild(li);
        });
    };

    const updatePlaylistUI = () => {
        const items = document.querySelectorAll('.playlist-item');
        items.forEach((item, i) => {
            if (i === currentIndex) item.classList.add('active');
            else item.classList.remove('active');
        });
    };

    window.musicPlayer = {
        play, pause, toggle, next, prev,
        setVolume, togglePlaylist,
        toggleShuffle, toggleLoop,
        closePanel,
        pauseForVideo,
        resumeAfterVideo
    };

    return { init, load: () => { } };
})();