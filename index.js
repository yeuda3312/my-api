const express = require("express");
const app = express();

app.all("/test", (req, res) => {
    console.log("התקבלה פנייה מימות המשיח");
    console.log(req.query);

    res.send("id_list_message=t-השרת עובד מצוין");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});