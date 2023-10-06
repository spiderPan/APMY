import domtoimage from 'dom-to-image';

let download_btn = document.getElementById('download-btn');

if (download_btn) {
    download_btn.onclick = function () {
        let post_content = document.getElementById('post-content');

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
                link.download = 'my-image-name.jpeg';
                link.href = dataUrl;
                link.click();
            }).catch(function (error) {
                // Handle any errors that occur during the conversion
                console.error('Error converting DOM to image:', error);
            });
    }
}
