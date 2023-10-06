import domtoimage from 'dom-to-image';

let download_btn = document.getElementById('download-btn');

if (download_btn) {
    download_btn.onclick = function () {
        domtoimage.toJpeg(
            document.getElementById('post-content'),
            {
                quality: 0.95,
                bgcolor: '#fff',
                style: { padding: '15px 25px 15px 25px' }
            })
            .then(function (dataUrl) {
                var link = document.createElement('a');
                link.download = 'my-image-name.jpeg';
                link.href = dataUrl;
                link.click();
            });
    }
}
