import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

// תמיכה בקבלת נתונים מימות המשיח
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// אתחול Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// נקודת הקצה לקריאות API מימות המשיח
app.all('/gemini-handler', async (req, res) => {
    try {
        const userText = req.query.user_question || req.body.user_question || "שלום";

        // שליחת הבקשה ל-Gemini
        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // החזרת התשובה להקראה מובנית בימות המשיח
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error);
        res.send("id_list_message=t-אירעה שגיאה בעיבוד הבקשה&go_to_folder=hangup");
    }
});

// הגדרת יציאה פתוחה לחיבור ב-Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
