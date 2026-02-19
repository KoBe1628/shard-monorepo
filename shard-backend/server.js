require("dotenv").config(); // Load the secrets
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

// 1. Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
// Render will automatically assign a PORT. If we are local, use 3000.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// XP Logic
function calculateXP(issue) {
  let xp = 0;
  const priority = issue.fields.priority
    ? issue.fields.priority.name
    : "Medium";
  const type = issue.fields.issuetype ? issue.fields.issuetype.name : "Task";

  xp += 100;
  if (priority === "High") xp += 50;
  if (priority === "Critical") xp += 150;
  if (type === "Bug") xp = xp * 1.5;

  return Math.floor(xp);
}

// 2. Load Users on Start
app.get("/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 3. The Webhook Listener (Now with Memory!)
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.issue && data.user) {
    const userName = data.user.displayName;
    const earnedXP = calculateXP(data.issue);

    console.log(`⚡ EVENT: ${userName} earned ${earnedXP} XP`);

    // A. Check if user exists in DB
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("name", userName)
      .single();

    let newXP = earnedXP;
    let newLevel = 1;

    if (existingUser) {
      newXP = existingUser.xp + earnedXP;
      newLevel = Math.floor(newXP / 1000) + 1;

      // Update existing
      await supabase
        .from("users")
        .update({ xp: newXP, level: newLevel, last_active: new Date() })
        .eq("name", userName);
    } else {
      // Create new
      await supabase
        .from("users")
        .insert([{ name: userName, xp: newXP, level: 1 }]);
    }

    // B. Broadcast to Frontend (Just for the visual pop)
    io.emit("xp-event", {
      user: userName,
      xp: earnedXP,
      message: `closed a ${data.issue.fields.issuetype.name}`,
    });
  }

  res.status(200).send("Webhook received");
});

server.listen(PORT, () => {
  console.log(`🔮 SHARD Oracle connected to Database on port ${PORT}`);
});
