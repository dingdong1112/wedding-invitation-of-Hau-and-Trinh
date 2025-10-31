import { guest } from './app/guest/guest.js';

((w) => {
    // 1. Khởi tạo ứng dụng gốc (giữ nguyên)
    w.undangan = guest.init();

    // --- BẮT ĐẦU CODE ĐIỀU KHIỂN ÂM THANH VIDEO YOUTUBE ---
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
    // --- KẾT THÚC CODE ĐIỀU KHIỂN ÂM THANH VIDEO YOUTUBE ---

    // --- BẮT ĐẦU CODE TẠO LINK LỊCH (PHIÊN BẢN SỬA LỖI CUỐI CÙNG CHO iOS) ---
    document.addEventListener('DOMContentLoaded', function() {
    
        const eventTitle = "Lễ Cưới Duy Hậu & Diễm Trinh";
        const eventDescription = "Trân trọng kính mời bạn đến tham dự lễ thành hôn của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi.";
        const eventLocation = "Địa chỉ tổ chức sự kiện, ABC, XYZ";
        const eventDurationHours = 4;
        
        const startTimeString = document.body.getAttribute('data-time');
        if (!startTimeString) return;

        const startTime = new Date(startTimeString.replace(/-/g, '/'));
        const endTime = new Date(startTime.getTime() + eventDurationHours * 60 * 60 * 1000);

        // Tạo link cho Google Calendar (giữ nguyên, vì nó hoạt động tốt)
        function formatGoogleDate(date) {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        }
        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
        const googleCalendarElement = document.getElementById('google-calendar-link');
        if (googleCalendarElement) {
            googleCalendarElement.href = googleLink;
        }

        // === PHẦN SỬA LỖI QUAN TRỌNG CHO APPLE/OUTLOOK/YAHOO ===
        
        // 1. Tạo sẵn nội dung file .ics và Data URI
        const cal = ics();
        cal.addEvent(eventTitle, eventDescription, eventLocation, startTime, endTime);
        const icsFileContent = cal.build();
        const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsFileContent);

        // 2. Hàm xử lý sự kiện click
        function handleIcsClick(event) {
            // Ngăn mọi hành động mặc định của link và Bootstrap
            event.preventDefault();
            event.stopPropagation();
            
            // Trực tiếp ra lệnh cho trình duyệt điều hướng đến Data URI
            window.location.href = dataUri;
        }

        // 3. Gán sự kiện click cho các link .ics
        const icsLinkElements = document.querySelectorAll('#ics-calendar-link, #outlook-calendar-link, #yahoo-calendar-link');
        
        icsLinkElements.forEach(element => {
            // Đặt href vô hại để đảm bảo nó vẫn là một link
            element.setAttribute('href', 'javascript:void(0);'); 
            element.addEventListener('click', handleIcsClick);
        });
    });
    // --- KẾT THÚC CODE TẠO LINK LỊCH ---

})(window);