/**
 * Main JS file for Scriptor behaviours
 */

// Responsive video embeds
let videoEmbeds = [
  'iframe[src*="youtube.com"]',
  'iframe[src*="vimeo.com"]'
];
reframe(videoEmbeds.join(','));

// Menu on small screens
let menuToggle = document.querySelectorAll('.menu-toggle');
if (menuToggle) {
  for (let i = 0; i < menuToggle.length; i++) {
    menuToggle[i].addEventListener('click', function (e) {
      document.body.classList.toggle('menu--opened');
      e.preventDefault();
    }, false);
  }
}
// Book Viewer (StPageFlip Edition)
function initBookViewers() {
  const containers = document.querySelectorAll('.book-container');
  if (!containers.length) return;

  const checkLib = setInterval(function() {
    if (window.St && window.St.PageFlip) {
      clearInterval(checkLib);
      
      containers.forEach(function(container) {
        const bookElement = container.querySelector('.flip-book');
        const prevBtn = container.querySelector('.book-prev');
        const nextBtn = container.querySelector('.book-next');
        const fsBtn = container.querySelector('.book-fullscreen');
        const currentSpan = container.querySelector('.current-page');

        if (!bookElement) return;

        // PageFlip settings (8.5x8.5 aspect ratio = 1:1)
        const pageFlip = new St.PageFlip(bookElement, {
            width: 850, // base page width
            height: 850, // base page height
            size: "stretch",
            minWidth: 300,
            maxWidth: 1000,
            minHeight: 300,
            maxHeight: 1000,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false
        });

        // Load pages
        const pages = [].slice.call(container.querySelectorAll('.page'));
        pageFlip.loadFromHTML(pages);
        
        // Ensure book is shown after load
        bookElement.style.display = 'block';

        // Update UI on page flip
        pageFlip.on('flip', function(e) {
            if (currentSpan) currentSpan.textContent = e.data + 1;
            if (prevBtn) prevBtn.disabled = (e.data === 0);
            if (nextBtn) nextBtn.disabled = (e.data === pageFlip.getPageCount() - 1);
        });

        if (prevBtn) {
          prevBtn.addEventListener('click', function() {
            pageFlip.flipPrev();
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener('click', function() {
            pageFlip.flipNext();
          });
        }

        if (fsBtn) {
          fsBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
              container.requestFullscreen().catch(function(err) {
                console.error('Error attempting to enable full-screen mode:', err.message);
              });
            } else {
              document.exitFullscreen();
            }
          });
        }

        window.addEventListener('resize', function() {
            pageFlip.update();
        });
      });
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(function() { clearInterval(checkLib); }, 10000);
}


document.addEventListener('DOMContentLoaded', initBookViewers);
