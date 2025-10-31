import { guest } from './app/guest/guest.js';

((w) => {
    // 1. Khởi tạo ứng dụng gốc (giữ nguyên)
    w.undangan = guest.init();

    // --- Code điều khiển YouTube (giữ nguyên) ---
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    var player;
    w.onYouTubeIframeAPIReady = function () {
        const playerElement = document.getElementById('youtube-player');
        if (playerElement) {
            player = new YT.Player('youtube-player', {
                events: { 'onReady': onPlayerReady }
            });
        }
    };
    function onPlayerReady(event) {
        const volumeButton = document.getElementById('volume-toggle');
        if (volumeButton) {
            const volumeIcon = volumeButton.querySelector('i');
            volumeButton.addEventListener('click', function () {
                if (player.isMuted()) {
                    player.unMute();
                    volumeIcon.classList.remove('fa-volume-mute');
                    volumeIcon.classList.add('fa-volume-up');
                } else {
                    player.mute();
                    volumeIcon.classList.remove('fa-volume-up');
                    volumeIcon.classList.add('fa-volume-mute');
                }
            });
        }
    }
    // --- Kết thúc code YouTube ---
})(window);