import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// שימוש במודל Lite היציב ביותר למסלול החינמי
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

app.all('/gemini-handler', async (req, res) => {
    try {
        const userText = req.query.user_question || req.body.user_question || "שלום";

        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // החזרת התשובה להקראה מובנית בימות המשיח
        res.send(`id_list_message=t-${responseText}&go_to_folder=hangup`);

    } catch (error) {
        console.error("Error processing request:", error);
        
        // טיפול ייעודי במקרה של חריגה ממכסת הקצב (Rate Limit)
        if (error.status === 429) {
            return res.send("id_list_message=t-המערכת עמוסה כרגע, אנא נסה שנית בעוד דקה&go_to_folder=hangup");
        }
        
        res.send("id_list_message=t-אירעה שגיאה בעיבוד הבקשה&go_to_folder=hangup");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
