import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'ms-edge-tts';
import fs from 'fs';
import path from 'path';

const app = express();

// הגדרת תמיכה ב-Body Parser לקבלת נתונים מימות המשיח
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// הגדרת תיקיית public להגשת קובצי השמע החוצה
app.use('/audio', express.static('public'));

// יצירת תיקיית public אם היא לא קיימת
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// אתחול Gemini API מתוך משתני הסביבה
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// נקודת הקצה (Endpoint) שאליה מגיעה השיחה מימות המשיח
app.all('/gemini-handler', async (req, res) => {
    try {
        // קבלת טקסט השאלה שנשלח מימות המשיח
        const userText = req.query.user_question || req.body.user_question || "שלום";

        // 1. פנייה ל-Gemini API
        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // 2. המרת התשובה לשמע בעברית (Edge-TTS חינמי)
        const tts = new MsEdgeTTS();
        await tts.setMetadata("he-IL-AvriNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        
        const filePath = path.join('public', 'response.mp3');
        await tts.toFile(filePath, responseText);

        // 3. החזרת פקודת השמעה לימות המשיח
        const serverUrl = process.env.SERVER_URL; // כתובת השרת ב-Render
        if (serverUrl) {
            res.send(`id_list_message=f-${serverUrl}/audio/response.mp3&go_to_folder=hangup`);
        } else {
            // גיבוי ל-TTS מובנה אם לא הוגדר SERVER_URL
            res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);
        }

    } catch (error) {
        console.error("Error processing request:", error);
        // תגובת גיבוי כדי שהשיחה לא תיתקע במידה ויש שגיאה
        res.send("id_list_message=t-אירעה שגיאה בעיבוד הבקשה, אנא נסה שנית&go_to_folder=hangup");
    }
});

// הגדרת הפורט המתאימה ל-Render - קריטי למניעת שגיאת Port scan timeout
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is successfully running and listening on port ${PORT}`);
});
