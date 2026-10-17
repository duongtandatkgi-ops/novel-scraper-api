const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // Cho phép tất cả các nguồn gọi API (CORS Header)
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
            error: 'Thiếu tham số URL! Vui lòng truyền ?url=...' 
        });
    }

    try {
        // Gửi request kèm Header giả lập trình duyệt máy tính để chống chặn bot
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': new URL(targetUrl).origin
            }
        });

        if (!response.ok) {
            throw new Error(`Trang web đích phản hồi lỗi HTTP: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Dọn dẹp các thẻ rác, quảng cáo, script thừa
        $('script, style, nav, footer, header, .ads, .hidden, iframe, noscript').remove();

        // Danh sách các class/id chứa nội dung truyện phổ biến ở các trang web tiếng Việt
        const possibleSelectors = [
            '.chapter-c', 
            '.reading-content', 
            '#content', 
            'article', 
            '.box-content', 
            '.chapter-content',
            '.entry-content',
            '.fon-con'
        ];

        let contentBox = null;
        for (let selector of possibleSelectors) {
            if ($(selector).length > 0) {
                contentBox = $(selector).first();
                break;
            }
        }

        let textContent = "";
        if (contentBox && contentBox.length > 0) {
            // Thay thế thẻ <br> thành xuống dòng để giữ cấu trúc đoạn văn
            contentBox.find('br').replaceWith('\n');
            textContent = contentBox.text();
        } else {
            // Fallback: Lấy toàn bộ body nếu không khớp cấu trúc trên
            $('body').find('br').replaceWith('\n');
            textContent = $('body').text();
        }

        // Làm sạch khoảng trắng thừa nhưng giữ lại ngắt dòng
        const cleanText = textContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return res.status(200).json({
            success: true,
            url: targetUrl,
            content: cleanText.substring(0, 15000) // Giới hạn tối đa 15.000 ký tự cho mượt
        });

    } catch (err) {
        return res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};
