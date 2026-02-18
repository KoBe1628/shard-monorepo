// server.js - NOW WITH REALTIME SOCKETS

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http"); // New
const { Server } = require("socket.io"); // New

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create the Socket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow the Frontend to connect
    methods: ["GET", "POST"],
  },
});

// --- THE XP LOGIC ---
function calculateXP(issue) {
  let xp = 0;
  const priority = issue.fields.priority
    ? issue.fields.priority.name
    : "Medium";
  const type = issue.fields.issuetype ? issue.fields.issuetype.name : "Task";

  xp += 100; // Base
  if (priority === "High") xp += 50;
  if (priority === "Critical") xp += 150;
  if (type === "Bug") xp = xp * 1.5;

  return Math.floor(xp);
}

// --- THE LISTENER ---
app.post("/webhook", (req, res) => {
  const data = req.body;

  if (data.issue) {
    const user = data.user ? data.user.displayName : "Unknown Hero";
    const earnedXP = calculateXP(data.issue);

    console.log(
      `⚡ EVENT: ${user} closed a ${data.issue.fields.issuetype.name} (+${earnedXP} XP)`
    );

    // 🔥 BROADCAST TO FRONTEND 🔥
    io.emit("xp-event", {
      user: user,
      xp: earnedXP,
      message: `closed a ${data.issue.fields.issuetype.name}`,
    });
  }

  res.status(200).send("Webhook received");
});

// Start the SERVER (Note: we use 'server.listen', not 'app.listen')
server.listen(PORT, () => {
  console.log(`🔮 SHARD Oracle is listening on port ${PORT}`);
});
