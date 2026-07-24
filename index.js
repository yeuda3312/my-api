require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("השרת עובד!");
});

app.post("/process-question", async (req, res) => {
    try {
        console.log("התקבלה בקשה:");
        console.log("BODY:");
console.log(req.body);

console.log("HEADERS:");
console.log(req.headers);

        // כאן בהמשך נוסיף:
        // 1. קבלת ההקלטה מימות המשיח
        // 2. שליחה ל-Gemini
        // 3. החזרת התשובה

        res.json({
            success: true,
            message: "הבקשה התקבלה בהצלחה"
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
