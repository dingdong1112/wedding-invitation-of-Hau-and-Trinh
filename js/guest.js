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

    // --- BẮT ĐẦU CODE TẠO LINK LỊCH (PHIÊN BẢN SỬA LỖI RACE CONDITION) ---
    document.addEventListener('DOMContentLoaded', function() {
        
        // Hàm chính để tạo link, chỉ chạy khi thư viện ics.js đã sẵn sàng
        function initializeCalendarLinks() {
            console.log('DEBUG: Thư viện ics.js đã sẵn sàng, bắt đầu tạo link.');

            const eventTitle = "Lễ Cưới Duy Hậu & Diễm Trinh";
            const eventDescription = "Trân trọng kính mời bạn đến tham dự lễ thành hôn của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi.";
            const eventLocation = "Địa chỉ tổ chức sự kiện, ABC, XYZ";
            const eventDurationHours = 4;
            
            const startTimeString = document.body.getAttribute('data-time');
            if (!startTimeString) return;

            const startTime = new Date(startTimeString.replace(/-/g, '/'));
            const endTime = new Date(startTime.getTime() + eventDurationHours * 60 * 60 * 1000);

            // Tạo link Google Calendar
            function formatGoogleDate(date) {
                return date.toISOString().replace(/-|:|\.\d+/g, '');
            }
            const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
            const googleCalendarElement = document.getElementById('google-calendar-link');
            if (googleCalendarElement) {
                googleCalendarElement.href = googleLink;
            }

            // Tạo Data URI cho các lịch khác
            // Quan trọng: Gọi hàm ics() thông qua `window.ics()` để chắc chắn
            const cal = window.ics(); 
            cal.addEvent(eventTitle, eventDescription, eventLocation, startTime, endTime);
            const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(cal.build());
            
            const icsLinkElements = document.querySelectorAll('#ics-calendar-link, #outlook-calendar-link, #yahoo-calendar-link');
            const fileName = "dam-cuoi.ics";

            icsLinkElements.forEach(element => {
                element.setAttribute('href', dataUri);
                element.setAttribute('download', fileName);
            });
        }

        // Hàm kiểm tra xem thư viện ics.js đã được tải hay chưa
        function checkForIcsAndRun() {
            // `window.ics` là hàm mà thư viện ics.js tạo ra trên phạm vi toàn cục
            if (typeof window.ics === 'function') {
                // Nếu đã có, chạy hàm chính của chúng ta
                initializeCalendarLinks();
            } else {
                // Nếu chưa có, đợi 100ms rồi kiểm tra lại
                console.log('DEBUG: Đang chờ thư viện ics.js tải về...');
                setTimeout(checkForIcsAndRun, 100);
            }
        }

        // Bắt đầu quá trình kiểm tra
        checkForIcsAndRun();
    });
    // --- KẾT THÚC CODE TẠO LINK LỊCH ---

})(window);