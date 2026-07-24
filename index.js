const express = require('express');
const axios = require('axios');
const app = express();

// כתובת ה-Stream הדינמי או דף המקור
const STREAM_URL = 'https://example.com/hls/live.m3u8'; 

app.get('/radio-stream', async (req, res) => {
    try {
        // משיכת זרם השמע מהאתר תוך התחזות לדפדפן
        const response = await axios({
            method: 'get',
            url: STREAM_URL,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        // הגדרת כותרת שמע והזרמת הנתונים בחזרה למערכת הטלפונית
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Error fetching stream');
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
