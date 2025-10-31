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
    document.addEventListener('DOMContentLoaded', function() {
    
        // ===================================================================
        // VUI LÒNG CHỈNH SỬA THÔNG TIN SỰ KIỆN CỦA BẠN TẠI ĐÂY
        // ===================================================================
        const eventTitle = "Lễ Cưới Duy Hậu & Diễm Trinh";
        const eventDescription = "Trân trọng kính mời bạn đến tham dự lễ thành hôn của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi.";
        const eventLocation = "Địa chỉ tổ chức sự kiện, ABC, XYZ";
        const eventDurationHours = 4;
        // ===================================================================

        const startTimeString = document.body.getAttribute('data-time');
        if (!startTimeString) return;

        const startTime = new Date(startTimeString.replace(/-/g, '/'));
        const endTime = new Date(startTime.getTime() + eventDurationHours * 60 * 60 * 1000);

        // --- Tạo link cho Google Calendar (giữ nguyên) ---
        function formatGoogleDate(date) {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        }
        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
        const googleCalendarElement = document.getElementById('google-calendar-link');
        if (googleCalendarElement) {
            googleCalendarElement.href = googleLink;
        }

        // --- PHẦN SỬA LỖI CHO CÁC LỊCH CÒN LẠI ---

        // 1. Tạo sẵn nội dung file .ics một lần duy nhất để tối ưu
        const cal = ics();
        cal.addEvent(eventTitle, eventDescription, eventLocation, startTime, endTime);
        const icsFileContent = cal.build();
        const blob = new Blob([icsFileContent], { type: 'text/calendar;charset=utf-8' });
        const fileName = "dam-cuoi.ics";

        // 2. Hàm để kích hoạt việc tải file
        function handleIcsDownload(event) {
            // Ngăn link tự động nhảy trang
            event.preventDefault(); 
            
            // Sử dụng FileSaver.js hoặc cách thủ công để tương thích rộng rãi
            // Cách thủ công: tạo 1 thẻ <a> ẩn, gán link blob, click và xóa đi
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            
            // Thêm vào body để có thể click
            document.body.appendChild(link);
            link.click();
            
            // Dọn dẹp
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        }

        // 3. Gán sự kiện 'click' cho các link Apple, Outlook, Yahoo
        const icsLinkElements = document.querySelectorAll('#ics-calendar-link, #outlook-calendar-link, #yahoo-calendar-link');
        
        icsLinkElements.forEach(element => {
            // Quan trọng: đặt href="#" để nó vẫn là một link có thể click
            element.setAttribute('href', '#'); 
            element.addEventListener('click', handleIcsDownload);
        });
    });

    // --- KẾT THÚC CODE TẠO LINK LỊCH ---

})(window);