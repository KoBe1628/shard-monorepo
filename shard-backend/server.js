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

// NEW: Load Current Boss
app.get("/boss", async (req, res) => {
  const { data, error } = await supabase
    .from("active_boss")
    .select("*")
    .eq("status", "active")
    .single(); // Get the single active boss

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// The Webhook Listener (v0.2.2: Persistent Boss Logic)
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.issue && data.user) {
    const userName = data.user.displayName;
    const issueType = data.issue.fields.issuetype.name;
    const earnedXP = calculateXP(data.issue);

    console.log(`⚡ EVENT: ${userName} earned ${earnedXP} XP`);

    // --- 1. USER LOGIC (Stats & Classes) ---
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("name", userName)
      .single();

    let newXP = earnedXP;
    let newLevel = 1;
    let bugs = issueType === "Bug" ? 1 : 0;
    let features = issueType !== "Bug" ? 1 : 0;
    let userClass = "Novice";

    if (existingUser) {
      newXP = existingUser.xp + earnedXP;
      newLevel = Math.floor(newXP / 1000) + 1;
      bugs += existingUser.bugs_fixed;
      features += existingUser.features_shipped;
      userClass = existingUser.class;
    }

    if (newLevel >= 3) {
      userClass = bugs > features ? "Rogue" : "Paladin";
    }

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

    // --- 2. BOSS LOGIC (Damage & Persistence) ---
    const { data: activeBoss } = await supabase
      .from("active_boss")
      .select("*")
      .eq("status", "active")
      .single();

    let newBossHP = 500;
    let bossName = "UNKNOWN BOSS";
    let bossMaxHP = 500;

    if (activeBoss) {
      // Subtract XP from Boss HP, but don't let it go below 0
      newBossHP = Math.max(0, activeBoss.hp - earnedXP);
      bossName = activeBoss.name;
      bossMaxHP = activeBoss.max_hp;

      // Save the new HP to the database
      await supabase
        .from("active_boss")
        .update({ hp: newBossHP })
        .eq("id", activeBoss.id);
    }

    // --- 3. BROADCAST TO TV ---
    io.emit("xp-event", {
      user: userName,
      xp: earnedXP,
      level: newLevel,
      class: userClass,
      message: `closed a ${issueType}`,
      boss: {
        name: bossName,
        hp: newBossHP,
        max_hp: bossMaxHP,
      },
    });
  }

  res.status(200).send("Webhook received");
});

server.listen(PORT, () => {
  console.log(`🔮 SHARD Oracle connected on port ${PORT}`);
});
