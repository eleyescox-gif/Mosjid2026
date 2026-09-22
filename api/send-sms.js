const https = require('https');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const apikey = req.body?.apikey || req.query?.apikey;
        const callerID = req.body?.callerID || req.query?.callerID || '1234';
        const number = req.body?.number || req.query?.number;
        const message = req.body?.message || req.query?.message;

        if (!apikey || !number || !message) {
            return res.status(400).json({
                success: false,
                message: 'apikey, number, এবং message ফিল্ড আবশ্যক'
            });
        }

        const encodedMsg = encodeURIComponent(message.trim());
        const encodedKey = encodeURIComponent(apikey.trim());
        const encodedCaller = encodeURIComponent(callerID.trim());
        const cleanNumber = number.replace(/[^0-9]/g, '');

        const url = `https://bulksmsdhaka.net/api/sendtext?apikey=${encodedKey}&callerID=${encodedCaller}&number=${cleanNumber}&message=${encodedMsg}`;

        // Make HTTPS request to BulkSMSDhaka
        const result = await new Promise((resolve, reject) => {
            const clientReq = https.get(url, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    resolve({
                        statusCode: apiRes.statusCode,
                        body: data
                    });
                });
            });

            clientReq.on('error', (err) => {
                reject(err);
            });

            clientReq.setTimeout(15000, () => {
                clientReq.destroy(new Error('BulkSMSDhaka API Request Timeout (15s)'));
            });
        });

        let json = null;
        try {
            json = JSON.parse(result.body);
        } catch (e) {
            json = { raw: result.body };
        }

        const rawMsg = (json && (json.message || json.Message || json.error || json.msg)) || result.body;

        if (json && (json.Success === "true" || json.Status === "1000" || json.status === "success")) {
            return res.status(200).json({
                success: true,
                message: rawMsg || 'এসএমএস সফলভাবে পাঠানো হয়েছে',
                data: json
            });
        }

        if (rawMsg && (rawMsg.includes('not whitelisted') || rawMsg.includes('Access Denied') || rawMsg.includes('IP'))) {
            return res.status(403).json({
                success: false,
                message: `BulkSMSDhaka থেকে অ্যাক্সেস বাতিল (IP Whitelist):\n"${rawMsg}"\n\n👉 bulksmsdhaka.net-এ লগইন করে API Settings থেকে IP Whitelist নিষ্ক্রিয় (Disable) করুন।`,
                data: json
            });
        }

        return res.status(result.statusCode >= 200 && result.statusCode < 300 ? 200 : 400).json({
            success: false,
            message: rawMsg || `এসএমএস গেটওয়ে রেসপন্স: ${result.statusCode}`,
            data: json
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: `সার্ভার সংযোগ ত্রুটি: ${err.message}`
        });
    }
};
