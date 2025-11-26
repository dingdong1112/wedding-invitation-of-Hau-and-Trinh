import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { cache } from '../../connection/cache.js';

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
    let currentIndex = 0;
    let isPlaying = false;
    let isPanelOpen = false;
    
    // --- BIẾN TRẠNG THÁI MỚI ---
    let isShuffle = false; 
    let loopMode = 1; 

    // Các Element giao diện
    const els = {
        widget: null, toggleBtn: null, panel: null,
        playBtn: null, title: null, playlistUl: null,
        playlistContainer: null, vinyl: null,
        shuffleBtn: null, loopBtn: null
    };

    // --- HÀM ĐÓNG BẢNG NHẠC (Khai báo ở đây để dùng chung) ---
    const closePanel = () => {
        if (isPanelOpen && els.panel && els.toggleBtn) {
            isPanelOpen = false;
            els.panel.classList.add('d-none');
            if(isPlaying) els.toggleBtn.classList.add('spin-slow');
            els.toggleBtn.innerHTML = '<i class="fa-solid fa-compact-disc"></i>';
        }
    };

    const init = () => {
        progress.add();
        
        // Map elements
        els.widget = document.getElementById('music-player-container');
        els.toggleBtn = document.getElementById('music-toggle-btn');
        els.panel = document.getElementById('music-panel');
        els.playBtn = document.getElementById('btn-play-pause');
        els.title = document.getElementById('current-song-title');
        els.playlistUl = document.getElementById('playlist-ul');
        els.playlistContainer = document.getElementById('playlist-container');
        els.vinyl = document.getElementById('vinyl-container');
        els.shuffleBtn = document.getElementById('btn-shuffle');
        els.loopBtn = document.getElementById('btn-loop');

        if (els.toggleBtn) {
            els.toggleBtn.addEventListener('click', () => {
                if (!isPanelOpen) {
                    // --- LOGIC MỞ BẢNG NHẠC ---
                    isPanelOpen = true;
                    els.panel.classList.remove('d-none');
                    els.toggleBtn.classList.remove('spin-slow'); 
                    els.toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    
                    // Đóng bảng pháo hoa nếu đang mở
                    const particlePanel = document.getElementById('particle-controls');
                    if (particlePanel) particlePanel.classList.remove('show');

                } else {
                    // --- LOGIC ĐÓNG BẢNG NHẠC ---
                    closePanel(); // Gọi hàm đã khai báo bên ngoài
                }
            });
        }

        // Lấy nhạc từ HTML nếu có
        const defaultUrl = document.body.getAttribute('data-audio');
        if(defaultUrl && playlist.length === 0) {
            playlist.push({ title: "Nhạc nền", src: defaultUrl });
        }

        // Sự kiện khi hết bài
        audioEl.addEventListener('ended', () => {
            if (loopMode === 2) {
                audioEl.currentTime = 0;
                play();
            } else {
                next(true); 
            }
        });

        renderPlaylist();
        loadTrack(0);
        updateModeButtons();

        progress.complete('audio');

        document.addEventListener('undangan.open', () => {
            els.widget?.classList.remove('d-none');
            play();
        });

        return { load: () => {} };
    };

    const loadTrack = (index) => {
        currentIndex = index;
        audioEl.src = playlist[currentIndex].src;
        audioEl.load();
        if(els.title) els.title.innerText = playlist[currentIndex].title;
        updatePlaylistUI();
    };

    const play = () => {
        audioEl.play().then(() => {
            isPlaying = true;
            updatePlayButton();
            updateVinylState();
        }).catch(e => console.log("Autoplay blocked"));
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

    // --- XỬ LÝ NÚT CHỨC NĂNG MỚI ---
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
        if(!els.shuffleBtn || !els.loopBtn) return;

        // Nút Shuffle
        if (isShuffle) els.shuffleBtn.classList.add('active');
        else els.shuffleBtn.classList.remove('active');

        // Nút Loop
        els.loopBtn.className = 'btn-control small'; 
        if (loopMode === 1) {
            els.loopBtn.classList.add('active'); 
        } else if (loopMode === 2) {
            els.loopBtn.classList.add('active', 'loop-one'); 
        }
    };

    const setVolume = (val) => audioEl.volume = val;
    const togglePlaylist = () => els.playlistContainer.classList.toggle('d-none');

    const updatePlayButton = () => {
        if(!els.playBtn) return;
        if (isPlaying) {
            els.playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            if(!isPanelOpen) els.toggleBtn?.classList.add('spin-slow');
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
        if(!els.playlistUl) return;
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
            if(i === currentIndex) item.classList.add('active');
            else item.classList.remove('active');
        });
    };

    // --- GÁN VÀO WINDOW ---
    window.musicPlayer = {
        play, pause, toggle, next, prev,
        setVolume, togglePlaylist,
        toggleShuffle, toggleLoop,
        closePanel // Export hàm này ra
    };

    return { init, load: () => {} };
})();