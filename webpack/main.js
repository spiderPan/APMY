import domtoimage from 'dom-to-image';

// Copy link button on post pages
const copyLinkBtn = document.getElementById('copy-link-btn');
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async function () {
        const url = copyLinkBtn.dataset.copyText || window.location.href;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for older / non-secure-context browsers
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            copyLinkBtn.dataset.copied = 'true';
            setTimeout(function () {
                delete copyLinkBtn.dataset.copied;
            }, 1800);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    });
}

let download_btn = document.getElementById('download-btn');

if (download_btn) {
    download_btn.onclick = function () {
        let post_content = document.getElementById('post-content'),
            post_title = document.getElementById('post-title');

        if (!post_content) {
            return;
        }

        post_content.style.padding = '15px 25px 15px 25px';

        domtoimage.toJpeg(
            post_content,
            {
                quality: 0.95,
                bgcolor: '#fff'
            })
            .then(function (dataUrl) {
                var link = document.createElement('a');
                link.download = post_title.innerText + '.jpeg';
                link.href = dataUrl;
                link.click();
            }).catch(function (error) {
                // Handle any errors that occur during the conversion
                console.error('Error converting DOM to image:', error);
            });
    }
}
