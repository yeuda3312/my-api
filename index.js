import express from 'express';
import Groq from 'groq-sdk';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.all('/gemini-handler', async (req, res) => {
    try {
        // שלב א': המערכת מגיעה לשלוחה לראשונה -> מבקשים הקלטה מהמאזין
        if (!req.query.read_file && !req.body.read_file) {
            // id_list_message = משמיע הודעה (תקליט אחרי הצליל), read = מקליט שמע ומחזיר לשרת
            return res.send("id_list_message=t-אנא אמור את שאלתך לאחר הצליל&read=f-messages/last_record,v,no,no,1,7,yes,no");
        }

        // שלב ב': המאזין סיים להקליט והקובץ התקבל בשרת
        const systemId = req.query.system_id || req.body.system_id || req.query.ApiPhone || req.body.ApiPhone;

        let userText = "";

        if (systemId) {
            // הורדת ההקלטה שהרגע בוצעה
            const fileUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${systemId}&path=messages/last_record.wav`;

            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(arrayBuffer);

            const fileBytes = new File([fileBuffer], 'speech.wav', { type: 'audio/wav' });

            // תרגום שמע לטקסט (STT) באמצעות Groq Whisper
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

        // שלב ג': שליחת הטקסט ל-AI לקבלת תשובה
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: userText }],
            model: 'llama-3.3-70b-versatile',
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "לא התקבלה תשובה";

        // השמעת התשובה וסיום שיחה
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error.message || error);
        res.send("id_list_message=t-אירעה שגיאה בעיבוד השמע, אנא נסה שוב&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
