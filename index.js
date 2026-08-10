import express from 'express';
import Groq from 'groq-sdk';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.all('/gemini-handler', async (req, res) => {
    try {
        const userText = req.query.user_question || req.body.user_question;

        // אם עדיין לא התקבלה שאלה, נבקש הקלטה עם צליל ביפ מוגדר (b)
        if (!userText) {
            return res.send("read=t-נא השמע את שאלתך לאחר הצליל ובסיום הקש סולמית=user_question,v,stt,he-IL,,b,yes");
        }

        // שליחת הטקסט ל-Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: userText }],
            model: 'llama-3.3-70b-versatile',
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "לא התקבלה תשובה";

        // השמעת התשובה וניתוק
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error);
        res.send("id_list_message=t-אירעה שגיאה בעיבוד הבקשה, אנא נסה שוב&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
