import express from 'express';
import Groq from 'groq-sdk';
import axios from 'axios';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.all('/gemini-handler', async (req, res) => {
    try {
        const fileFolder = req.query.file_folder || req.body.file_folder || "messages";
        const fileName = req.query.file_name || req.body.file_name || "last_record";
        const systemId = req.query.system_id || req.body.system_id || req.query.ApiPhone || req.body.ApiPhone;

        let userText = "";

        if (systemId) {
            const fileUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${systemId}&path=${fileFolder}/${fileName}.wav`;
            
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const fileBuffer = Buffer.from(response.data);

            const fileBytes = new File([fileBuffer], 'speech.wav', { type: 'audio/wav' });

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

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: userText }],
            model: 'llama-3.3-70b-versatile',
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "לא התקבלה תשובה";

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
