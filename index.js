import express from 'express';
import Groq from 'groq-sdk';
import axios from 'axios';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.all('/gemini-handler', async (req, res) => {
    try {
        // קבלת נתוני הקובץ שהוקלט מימות המשיח
        const fileFolder = req.query.file_folder || req.body.file_folder;
        const fileName = req.query.file_name || req.body.file_name;
        const systemId = req.query.system_id || req.body.system_id;

        let userText = "";

        // אם התקבל קובץ הקלטה, נוריד אותו ונמיר אותו לטקסט דרך Groq Whisper
        if (fileFolder && fileName && systemId) {
            const fileUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${systemId}&path=${fileFolder}/${fileName}.wav`;
            
            // הורדת הקובץ משרתי ימות המשיח
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const fileBuffer = Buffer.from(response.data);

            // יצירת אובייקט קובץ לשליחה ל-Whisper
            const fileBytes = new File([fileBuffer], 'speech.wav', { type: 'audio/wav' });

            // המרת השמע לטקסט בחינם באמצעות Whisper ב-Groq
            const transcription = await groq.audio.transcriptions.create({
                file: fileBytes,
                model: 'whisper-large-v3',
                language: 'he',
            });

            userText = transcription.text;
        }

        if (!userText) {
            userText = "שלום";
        }

        // שליחת הטקסט שהתקבל מהשמע אל מודל ה-AI לקבלת תשובה
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: userText }],
            model: 'llama-3.3-70b-versatile',
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "לא התקבלה תשובה";

        // השמעת התשובה למאזין וניתוק השיחה
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error);
        res.send("id_list_message=t-אירעה שגיאה בעיבוד השמע, אנא נסה שוב&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
