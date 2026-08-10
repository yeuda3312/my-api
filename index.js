import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'ms-edge-tts';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/audio', express.static('public')); // הגשת קובצי השמע

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.all('/gemini-handler', async (req, res) => {
    try {
        const userText = req.query.user_question || req.body.user_question || "שלום";

        // 1. פנייה ל-Gemini API (חינם)
        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // 2. המרה לשמע חינמי באיכות גבוהה (Edge TTS - קול Avri או Hila)
        const tts = new MsEdgeTTS();
        await tts.setMetadata("he-IL-AvriNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        
        const filePath = path.join('public', 'response.mp3');
        await tts.toFile(filePath, responseText);

        // 3. החזרת פקודה לימות המשיח להשמעת הקובץ מכתובת השרת הציבורית
        const serverUrl = process.env.SERVER_URL; // הכתובת של השרת החינמי שלך ב-Render/Vercel
        res.send(`id_list_message=f-${serverUrl}/audio/response.mp3&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error:", error);
        // מענה ברירת מחדל באמצעות TTS מובנה של ימות המשיח (חינם)
        res.send("id_list_message=t-אירעה שגיאה, אנא נסה שוב&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
