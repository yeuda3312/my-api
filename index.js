import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.all('/gemini-handler', async (req, res) => {
    try {
        const userText = req.query.user_question || req.body.user_question || "שלום";

        // פנייה ל-Gemini API
        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // החזרת תשובה להקראה מובנית בימות המשיח
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error);
        res.send("id_list_message=t-אירעה שגיאה בעיבוד הבקשה&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
