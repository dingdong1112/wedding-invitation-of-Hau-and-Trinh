/*
Refactored page-flip / detail modal module
- Encapsulated in IIFE
- Caches bootstrap modal instances
- Delegates page click events (reduces listeners)
- Does not reopen detail modal on navigate -> updates current image
- Preloads neighbors, lazy loads images
- Touch handlers use addEventListener with passive:false where needed
- Accessibility + defensive checks + cleanup

Usage: Ensure this script loads after DOM and after page-flip.browser.js and bootstrap are available.
HTML expects these public methods (attached to undangan.guest):
- openAlbum(ext)
- closeDetailModal()
- closeDetailModal2()
- navigateDetail(direction)
*/
(function (global) {
  'use strict';

  // CONFIG
  const BOOK_RATIO = 1.5; // width/height ratio reference
  const DEFAULT_MAX_WIDTH = 800;
  const CLICK_DELAY = 300; // ms for distinguishing single vs dbl click on desktop
  const DOUBLE_TAP_MAX = 500; // max ms for mobile double-tap

  // State
  let VERCEL_BASE_URL = (typeof window !== 'undefined' && window.VERCEL_BASE_URL) || '';
  let allImagesUrls = [];
  let currentDetailIndex = 0;
  let pageFlipInstance = null;

  // Cached DOM & modals
  const cache = {
    albumModalEl: null,
    detailModalEl: null,
    bookEl: null,
    detailThumbs: null,
    detailImageEl: null,
    albumModalInstance: null,
    detailModalInstance: null
  };

  // Helper: safe DOM getter
  function $id(id) { return document.getElementById(id); }

  // Helper: cache/get bootstrap modal instance
  function getModalInstance(id) {
    const el = $id(id);
    if (!el) return null;
    const inst = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    return inst;
  }

  // Fetch images from API (same contract as your original code)
  async function fetchGalleryImages(ext = 'webp') {
    try {
      if (!VERCEL_BASE_URL) console.warn('VERCEL_BASE_URL is not set');
      const apiUrl = `${VERCEL_BASE_URL}/api/gallery?ext=${encodeURIComponent(ext)}`;
      const res = await fetch(apiUrl);
      if (res.status !== 200) throw new Error(`API returned status ${res.status}`);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.files) && json.files.length) return json.files;
      return [];
    } catch (e) {
      console.error('Lỗi tải danh sách ảnh:', e);
      if (typeof util !== 'undefined' && util.notify) util.notify('Không thể tải Album ảnh.').error();
      return [];
    }
  }

  // Initialize references (call once before using modals)
  function initRefs() {
    cache.albumModalEl = cache.albumModalEl || $id('albumModal');
    cache.detailModalEl = cache.detailModalEl || $id('detailModal');
    cache.bookEl = cache.bookEl || $id('book');
    cache.detailThumbs = cache.detailThumbs || $id('detail-thumbnails');
    cache.detailImageEl = cache.detailImageEl || $id('detail-fullscreen-image');

    cache.albumModalInstance = cache.albumModalInstance || getModalInstance('albumModal');
    cache.detailModalInstance = cache.detailModalInstance || getModalInstance('detailModal');
  }

  // Accessibility helpers
  function setAriaForButtons() {
    const prev = $id('btn-prev-detail');
    const next = $id('btn-next-detail');
    if (prev) prev.setAttribute('aria-label', 'Previous image');
    if (next) next.setAttribute('aria-label', 'Next image');
  }

  // Show the detail modal and render thumbnails if needed
  function openDetailModal(startIndex = 0) {
    initRefs();
    if (!allImagesUrls || !allImagesUrls.length) return;
    startIndex = Math.max(0, Math.min(allImagesUrls.length - 1, startIndex));

    // render thumbnails once
    if (cache.detailThumbs && !cache.detailThumbs.dataset.rendered) {
      cache.detailThumbs.innerHTML = '';
      allImagesUrls.forEach((src, i) => {
        const thumb = document.createElement('img');
        thumb.src = src; // thumbnails small images: if you have a smaller variant, use it
        thumb.alt = `Thumbnail ${i + 1}`;
        thumb.loading = 'lazy';
        thumb.className = 'rounded-3 shadow-sm cursor-pointer mx-1';
        thumb.style.cssText = 'width:60px;height:60px;object-fit:cover;opacity:0.6;border:0;';
        thumb.dataset.index = i;
        thumb.addEventListener('click', () => updateDetailIndex(i));
        thumb.addEventListener('contextmenu', e => e.preventDefault());
        cache.detailThumbs.appendChild(thumb);
      });
      cache.detailThumbs.dataset.rendered = '1';
    }

    // show modal
    cache.detailModalInstance = cache.detailModalInstance || getModalInstance('detailModal');
    cache.detailModalInstance.show();
    setAriaForButtons();

    // Update shown image
    updateDetailIndex(startIndex);

    // Attach keyboard handlers for accessibility while modal open
    const shownHandler = () => {
      document.addEventListener('keydown', detailKeydownHandler);
    };
    const hideHandler = () => {
      document.removeEventListener('keydown', detailKeydownHandler);
      // reset transform
      if (cache.detailImageEl) cache.detailImageEl.style.transform = 'scale(1) translate(0,0)';
    };

    cache.detailModalEl.addEventListener('shown.bs.modal', shownHandler, { once: true });
    cache.detailModalEl.addEventListener('hidden.bs.modal', hideHandler, { once: true });
  }

  function detailKeydownHandler(e) {
    if (!cache.detailModalEl || !cache.detailModalEl.classList.contains('show')) return;
    if (e.key === 'ArrowLeft') navigateDetail(-1);
    if (e.key === 'ArrowRight') navigateDetail(1);
    if (e.key === 'Escape') closeDetailModal();
  }

  // Update the detail modal to show index (without reopening the modal)
  function updateDetailIndex(index) {
    if (!Array.isArray(allImagesUrls) || !allImagesUrls.length) return;
    index = Math.max(0, Math.min(allImagesUrls.length - 1, index));
    currentDetailIndex = index;

    if (!cache.detailImageEl) cache.detailImageEl = $id('detail-fullscreen-image');
    if (!cache.detailThumbs) cache.detailThumbs = $id('detail-thumbnails');

    // set image
    if (cache.detailImageEl) {
      cache.detailImageEl.src = allImagesUrls[index];
      cache.detailImageEl.alt = `Ảnh ${index + 1} trên ${allImagesUrls.length}`;
      cache.detailImageEl.oncontextmenu = e => e.preventDefault();
      // reset transform
      cache.detailImageEl.style.transition = 'transform 0.2s ease-out';
      cache.detailImageEl.style.transform = 'scale(1) translate(0,0)';
    }

    // highlight thumb
    if (cache.detailThumbs) {
      const thumbs = cache.detailThumbs.querySelectorAll('img');
      thumbs.forEach((img, i) => {
        img.style.border = i === index ? '3px solid #ff4081' : 'none';
        img.style.opacity = i === index ? '1' : '0.6';
        if (i === index) img.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    }

    // preload neighbors
    preloadNeighbors(index);
  }

  function preloadNeighbors(index) {
    [index - 1, index + 1].forEach(i => {
      if (i >= 0 && i < allImagesUrls.length) {
        const im = new Image();
        im.src = allImagesUrls[i];
      }
    });
  }

  // Navigation used by buttons in HTML
  function navigateDetail(direction) {
    const total = allImagesUrls.length;
    if (!total) return;
    const newIndex = (currentDetailIndex + direction + total) % total;
    updateDetailIndex(newIndex);
  }

  // Close detail modal and return to album (if desired)
  function closeDetailModal() {
    initRefs();
    if (cache.detailImageEl) {
      cache.detailImageEl.style.transform = 'scale(1) translate(0,0)';
      cache.detailImageEl.src = '';
    }

    cache.detailModalInstance = cache.detailModalInstance || getModalInstance('detailModal');
    if (cache.detailModalInstance) cache.detailModalInstance.hide();

    // show album modal again if album exists
    if (cache.albumModalInstance) cache.albumModalInstance.show();
  }

  // Close album detail and cleanup (keeps album visible state reset)
  function closeDetailModal2() {
    initRefs();

    // flip album to current index safely
    if (pageFlipInstance && typeof currentDetailIndex === 'number') {
      try {
        // prefer flip to visible position (depends on PageFlip API)
        if (typeof pageFlipInstance.flip === 'function') pageFlipInstance.flip(currentDetailIndex);
      } catch (e) { console.warn('flip error', e); }
    }

    // Hide album modal using bootstrap (preferred) and then cleanup in hidden handler
    if (cache.albumModalInstance) cache.albumModalInstance.hide();

    // If you're doing manual DOM cleanup, do it after the modal fully hides
    const hiddenHandler = () => {
      if (pageFlipInstance) {
        try { pageFlipInstance.destroy(); } catch (err) { console.warn(err); }
        pageFlipInstance = null;
      }
      // reset #book
      if (cache.bookEl) cache.bookEl.outerHTML = `<div id="book" style="display:none"></div>`;
      // remove backdrops and bootstrap classes if any leftover
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };

    cache.albumModalEl.addEventListener('hidden.bs.modal', hiddenHandler, { once: true });
  }

  // Initialize & open album (page flip)
  async function initPageFlipAlbum(ext = 'webp') {
    initRefs();

    // ensure DOM exists
    if (!cache.albumModalEl) return console.error('albumModal element not found');

    // ensure #book exists, if not create
    if (!cache.bookEl) {
      const modalBody = cache.albumModalEl.querySelector('.modal-body');
      if (!modalBody) return console.error('modal-body không tồn tại!');
      modalBody.insertAdjacentHTML('afterbegin', `<div id="book" style="display:none"></div>`);
      cache.bookEl = $id('book');
    }

    // load images
    allImagesUrls = await fetchGalleryImages(ext);
    if (!allImagesUrls.length) return util && util.notify ? util.notify('Album rỗng').info() : console.warn('No images');

    // Destroy old PageFlip if any
    if (pageFlipInstance) {
      try { pageFlipInstance.destroy(); } catch (e) { console.warn(e); }
      pageFlipInstance = null;
    }

    // show album modal
    cache.albumModalInstance = cache.albumModalInstance || getModalInstance('albumModal');
    cache.albumModalInstance.show();

    requestAnimationFrame(() => {
      // compute sizes
      const screenWidth = window.innerWidth;
      const finalWidth = Math.min(DEFAULT_MAX_WIDTH, screenWidth * 0.95);
      const finalHeight = finalWidth / BOOK_RATIO;
      const singlePageWidth = finalWidth / 2;

      // create page elements
      const pageElements = allImagesUrls.map((url, index) => {
        const page = document.createElement('div');
        page.className = 'my-page';
        page.dataset.pageIndex = index;
        if (index === 0 || index === allImagesUrls.length - 1) page.dataset.density = 'hard';

        const img = document.createElement('img');
        img.src = url;
        img.loading = 'lazy';
        img.alt = `Album image ${index + 1}`;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';

        page.appendChild(img);
        return page;
      });

      // ensure PageFlip exists
      if (typeof St === 'undefined' || typeof St.PageFlip === 'undefined') {
        console.error('St.PageFlip not available');
        return;
      }

      pageFlipInstance = new St.PageFlip(cache.bookEl, {
        width: singlePageWidth,
        height: finalHeight,
        size: 'fixed',
        drawShadow: true,
        flippingTime: 600,
        showCover: true,
        disableFlipByClick: true
      });

      // attach events via delegation on the book element (cheaper than binding per page)
      function onBookClick(e) {
        const page = e.target.closest('.my-page');
        if (!page) return;
        const pageIndex = Number(page.dataset.pageIndex);
        // single click: PageFlip flips naturally — we only intercept double-click/tap
        // Here open detail on double-click event handled separately
      }

      // handle dblclick to open detail
      function onBookDblClick(e) {
        const page = e.target.closest('.my-page');
        if (!page) return;
        const pageIndex = Number(page.dataset.pageIndex);
        openDetailModal(pageIndex);
      }

      // mobile double-tap: we simulate via touchend
      let lastTapTime = 0;
      cache.bookEl.addEventListener('touchend', (e) => {
        const page = e.target.closest('.my-page');
        if (!page) return;
        const now = Date.now();
        const timeDiff = now - lastTapTime;
        const pageIndex = Number(page.dataset.pageIndex);
        if (timeDiff > 0 && timeDiff < DOUBLE_TAP_MAX) {
          e.preventDefault();
          openDetailModal(pageIndex);
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;
      }, { passive: true });

      // swipe on the book (page flip)
      let startX = 0, startY = 0, isTouching = false;
      cache.bookEl.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isTouching = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
      }, { passive: true });

      cache.bookEl.addEventListener('touchend', e => {
        if (!isTouching) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
          if (dx > 0) pageFlipInstance.flipPrev && pageFlipInstance.flipPrev('top');
          else pageFlipInstance.flipNext && pageFlipInstance.flipNext('top');
        }
        isTouching = false;
      }, { passive: true });

      // DOM events for flip lifecycle
      const initHandler = () => { /* nothing to do: we use delegation */ };
      const flipHandler = () => { /* delegation covers new pages too */ };

      pageFlipInstance.on('init', initHandler);
      pageFlipInstance.on('flip', flipHandler);
      pageFlipInstance.on('changeState', flipHandler);

      // dblclick and click delegation
      cache.bookEl.addEventListener('click', onBookClick);
      cache.bookEl.addEventListener('dblclick', onBookDblClick);

      // load into PageFlip once modal has shown
      cache.albumModalEl.addEventListener('shown.bs.modal', () => {
        try { pageFlipInstance.loadFromHTML(pageElements); } catch (err) { console.error(err); }
      }, { once: true });

      // cleanup on modal hidden
      cache.albumModalEl.addEventListener('hidden.bs.modal', () => {
        try { pageFlipInstance.destroy(); } catch (err) { console.warn(err); }
        pageFlipInstance = null;
        // reset book element to original
        const be = $id('book');
        if (be) be.outerHTML = `<div id="book" style="display:none"></div>`;
        // remove leftovers
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      }, { once: true });

    }); // requestAnimationFrame
  }

  // touch/zoom handlers for detail image: attach once when script loads
  function initDetailImageInteractions() {
    initRefs();
    const img = cache.detailImageEl || $id('detail-fullscreen-image');
    if (!img) return;

    // local state
    let scale = 1, moveX = 0, moveY = 0, startDist = null, startX = 0, startY = 0, touchStartX = 0;

    function getDist(touches) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      return Math.hypot(dx, dy);
    }

    img.style.transition = 'transform 0.2s ease-out';
    img.style.transform = 'scale(1) translate(0,0)';

    img.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) startDist = getDist(e.touches);
      else if (e.touches.length === 1 && scale > 1) {
        startX = e.touches[0].pageX - moveX;
        startY = e.touches[0].pageY - moveY;
      }
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    img.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && startDist !== null) {
        e.preventDefault();
        const dist = getDist(e.touches);
        scale = Math.min(4, Math.max(1, scale * (dist / startDist)));
        img.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;
        startDist = dist;
      } else if (e.touches.length === 1 && scale > 1) {
        e.preventDefault();
        moveX = e.touches[0].pageX - startX;
        moveY = e.touches[0].pageY - startY;
        img.style.transform = `scale(${scale}) translate(${moveX}px,${moveY}px)`;
      }
    }, { passive: false });

    img.addEventListener('touchend', (e) => {
      startDist = null;
      if (scale === 1 && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) navigateDetail(dx < 0 ? 1 : -1);
      }
    });
  }

  // Utility: preload single image
  function preload(src) { const i = new Image(); i.src = src; }

  // Public API export onto your existing object path
  global.undangan = global.undangan || {};
  global.undangan.guest = global.undangan.guest || {};

  global.undangan.guest.openAlbum = (ext = 'webp') => initPageFlipAlbum(ext);
  global.undangan.guest.closeDetailModal = closeDetailModal;
  global.undangan.guest.closeDetailModal2 = closeDetailModal2;
  global.undangan.guest.navigateDetail = navigateDetail;

  // init interactions after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initRefs();
    initDetailImageInteractions();
  });
  // --- optional: expose legacy alias PageflipAlbum so old onclicks still work ---
  window.PageflipAlbum = {
    openAlbum: (...args) => window.undangan?.guest?.openAlbum?.(...args),
    closeAlbum: () => window.undangan?.guest?.closeDetailModal2?.(),
    closeDetail: () => window.undangan?.guest?.closeDetailModal?.(),
    navigateDetail: (dir) => window.undangan?.guest?.navigateDetail?.(dir),
    // openDetail (open single-image modal) -> expose existing internal function if needed
    openDetail: (idx) => {
      // open detail modal directly (if function exported as undangan.guest.openDetail)
      if (typeof window.undangan?.guest?.openDetail === 'function') {
        return window.undangan.guest.openDetail(idx);
      }
      // fallback: open album first, user can click to open detail
      return window.undangan?.guest?.openAlbum?.();
    }
  };

})(window);
