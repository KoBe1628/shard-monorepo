require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const app = express();
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

// Load Users
app.get("/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// The Webhook Listener (v0.2: The Sorting Hat)
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.issue && data.user) {
    const userName = data.user.displayName;
    const issueType = data.issue.fields.issuetype.name;
    const earnedXP = calculateXP(data.issue);

    console.log(`⚡ EVENT: ${userName} earned ${earnedXP} XP`);

    // 1. Get existing user
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("name", userName)
      .single();

    let newXP = earnedXP;
    let newLevel = 1;
    let bugs = 0;
    let features = 0;
    let userClass = "Novice";

    if (existingUser) {
      newXP = existingUser.xp + earnedXP;
      newLevel = Math.floor(newXP / 1000) + 1;
      bugs = existingUser.bugs_fixed;
      features = existingUser.features_shipped;
      userClass = existingUser.class;
    }

    // 2. Count the specific stats
    if (issueType === "Bug") {
      bugs += 1;
    } else {
      features += 1;
    }

    // 3. Class Awakening Logic (Level 3+)
    if (newLevel >= 3) {
      if (bugs > features) {
        userClass = "Rogue";
      } else {
        userClass = "Paladin";
      }
    }

    // 4. Save to Database
    if (existingUser) {
      await supabase
        .from("users")
        .update({
          xp: newXP,
          level: newLevel,
          class: userClass,
          bugs_fixed: bugs,
          features_shipped: features,
          last_active: new Date(),
        })
        .eq("name", userName);
    } else {
      await supabase.from("users").insert([
        {
          name: userName,
          xp: newXP,
          level: newLevel,
          class: userClass,
          bugs_fixed: bugs,
          features_shipped: features,
        },
      ]);
    }

    // 5. Broadcast to Frontend (Include new stats!)
    io.emit("xp-event", {
      user: userName,
      xp: earnedXP,
      level: newLevel,
      class: userClass, // Send the class to the TV
      message: `closed a ${issueType}`,
    });
  }

  res.status(200).send("Webhook received");
});

server.listen(PORT, () => {
  console.log(`🔮 SHARD Oracle v0.2 connected on port ${PORT}`);
});
