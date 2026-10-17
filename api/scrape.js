const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // Bật CORS cho phép gọi từ mọi extension
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ 
            success: false, 
            error: 'Thiếu tham số URL!' 
        });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            }
        });

        if (!response.ok) {
            throw new Error(`Lỗi kết nối trang web: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Xóa các thành phần rác
        $('script, style, nav, footer, header, .ads, .hidden, iframe, noscript').remove();

        // Tìm vùng chứa nội dung truyện
        const selectors = [
            '.chapter-c', 
            '.reading-content', 
            '#content', 
            'article', 
            '.box-content', 
            '.chapter-content', 
            '.entry-content'
        ];

        let contentBox = null;
        for (let sel of selectors) {
            if ($(sel).length > 0) {
                contentBox = $(sel).first();
                break;
            }
        }

        let textContent = "";
        if (contentBox && contentBox.length > 0) {
            contentBox.find('br').replaceWith('\n');
            textContent = contentBox.text();
        } else {
            $('body').find('br').replaceWith('\n');
            textContent = $('body').text();
        }

        const cleanText = textContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return res.status(200).json({
            success: true,
            url: targetUrl,
            content: cleanText.substring(0, 15000)
        });

    } catch (err) {
        return res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};
