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
    w.onYouTubeIframeAPIReady = function () {
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
            volumeButton.addEventListener('click', function () {
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

    // --- BẮT ĐẦU CODE TẠO LINK LỊCH ---

    // Đợi cho toàn bộ nội dung trang được tải xong rồi mới chạy code
    document.addEventListener('DOMContentLoaded', function () {

        // ===================================================================
        // VUI LÒNG CHỈNH SỬA THÔNG TIN SỰ KIỆN CỦA BẠN TẠI ĐÂY
        // ===================================================================
        const eventTitle = "Lễ Cưới Duy Hậu & Diễm Trinh";
        const eventDescription = "Trân trọng kính mời bạn đến tham dự lễ thành hôn của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi.";
        const eventLocation = "Địa chỉ tổ chức sự kiện, ABC, XYZ"; // Thay bằng địa chỉ của bạn
        const eventDurationHours = 4; // Sự kiện kéo dài trong bao nhiêu giờ
        // ===================================================================

        // Lấy thời gian bắt đầu từ thuộc tính data-time của thẻ body
        const startTimeString = document.body.getAttribute('data-time');
        if (!startTimeString) return; // Dừng lại nếu không có data-time

        const startTime = new Date(startTimeString.replace(/-/g, '/'));
        const endTime = new Date(startTime.getTime() + eventDurationHours * 60 * 60 * 1000);

        // --- Hàm định dạng ngày giờ cho Google Calendar ---
        function formatGoogleDate(date) {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        }

        // --- Tạo link cho Google Calendar ---
        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
        const googleCalendarElement = document.getElementById('google-calendar-link');
        if (googleCalendarElement) {
            googleCalendarElement.href = googleLink;
        }

        // --- Tạo file .ics cho các lịch khác (Apple, Outlook, Yahoo) ---
        const cal = ics();
        cal.addEvent(eventTitle, eventDescription, eventLocation, startTime, endTime);

        // Gán link tải file .ics cho các nút còn lại
        const icsLinkElement = document.getElementById('ics-calendar-link');
        const outlookLinkElement = document.getElementById('outlook-calendar-link');
        const yahooLinkElement = document.getElementById('yahoo-calendar-link');

        // Tạo một "Blob" chứa dữ liệu file .ics
        const icsFile = cal.build();
        const blob = new Blob([icsFile], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);

        // Gán URL và thuộc tính download
        const downloadUrl = url;
        const fileName = "dam-cuoi.ics";

        if (icsLinkElement) {
            icsLinkElement.href = downloadUrl;
            icsLinkElement.setAttribute('download', fileName);
        }
        if (outlookLinkElement) {
            outlookLinkElement.href = downloadUrl;
            outlookLinkElement.setAttribute('download', fileName);
        }
        if (yahooLinkElement) {
            // Yahoo Calendar không hỗ trợ tải file trực tiếp, nhưng vẫn dùng .ics
            yahooLinkElement.href = downloadUrl;
            yahooLinkElement.setAttribute('download', fileName);
        }
    });

    // --- KẾT THÚC CODE TẠO LINK LỊCH ---

})(window);