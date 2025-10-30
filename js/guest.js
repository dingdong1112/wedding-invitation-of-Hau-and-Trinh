import { guest } from './app/guest/guest.js';

((w) => {
    w.undangan = guest.init();
})(window);

// --- CODE ĐIỀU KHIỂN ÂM THANH VIDEO YOUTUBE ---

// Chờ cho API của YouTube sẵn sàng
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
    const playerElement = document.getElementById('youtube-player');
    if (playerElement) {
        player = new YT.Player('youtube-player', {
            events: {
                'onReady': onPlayerReady
            }
        });
    }
}

function onPlayerReady(event) {
    // Video đã sẵn sàng
    const volumeButton = document.getElementById('volume-toggle');
    const volumeIcon = volumeButton.querySelector('i');

    volumeButton.addEventListener('click', function() {
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