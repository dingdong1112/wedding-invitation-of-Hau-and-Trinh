import { guest } from './app/guest/guest.js';

((w) => {
    // 1. Khởi tạo ứng dụng gốc (giữ nguyên)
    w.undangan = guest.init();

    // --- BẮT ĐẦU CODE ĐIỀU KHIỂN ÂM THANH VIDEO YOUTUBE ---

    // 2. Tải mã API IFrame Player của YouTube một cách bất đồng bộ.
    // Thao tác này sẽ tìm hàm onYouTubeIframeAPIReady() sau khi tải xong.
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player; // Biến này sẽ lưu trữ trình phát video

    // 3. Hàm này sẽ được API của YouTube tự động gọi khi nó đã sẵn sàng.
    // Chúng ta phải gán nó vào `window` (w) để API có thể tìm thấy.
    w.onYouTubeIframeAPIReady = function() {
        const playerElement = document.getElementById('youtube-player');
        if (playerElement) {
            player = new YT.Player('youtube-player', {
                events: {
                    'onReady': onPlayerReady // Gọi hàm onPlayerReady khi video sẵn sàng
                }
            });
        }
    };

    // 4. Hàm này sẽ chạy khi video player đã sẵn sàng.
    function onPlayerReady(event) {
        const volumeButton = document.getElementById('volume-toggle');
        // Chỉ thực hiện nếu nút âm thanh tồn tại
        if (volumeButton) {
            const volumeIcon = volumeButton.querySelector('i');

            // Gắn sự kiện click cho nút âm thanh
            volumeButton.addEventListener('click', function() {
                if (player.isMuted()) {
                    player.unMute(); // Bật tiếng
                    volumeIcon.classList.remove('fa-volume-mute');
                    volumeIcon.classList.add('fa-volume-up');
                } else {
                    player.mute(); // Tắt tiếng
                    volumeIcon.classList.remove('fa-volume-up');
                    volumeIcon.classList.add('fa-volume-mute');
                }
            });
        }
    }

    // --- KẾT THÚC CODE ĐIỀU KHIỂN ÂM THANH VIDEO YOUTUBE ---

})(window);