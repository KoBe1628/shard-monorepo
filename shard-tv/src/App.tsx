import { useState, useEffect } from "react";
import Boss from "./Boss";
import { Users, Activity, Trophy } from "lucide-react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

// Types
interface LogEntry {
  id: number;
  text: string;
  color: string;
}

interface User {
  name: string;
  xp: number;
  level: number;
}

function App() {
  const [bossHP, setBossHP] = useState(500);
  const [maxHP] = useState(500);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // NEW: Dynamic User State
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    socket.on("xp-event", (data) => {
      // 1. Damage Boss
      setBossHP((prev) => Math.max(0, prev - data.xp));

      // 2. Add Log
      const newLog = {
        id: Date.now(),
        text: `> ${data.user} ${data.message} (+${data.xp} XP)`,
        color: "text-green-400",
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 5));

      // 3. UPDATE THE ROSTER (The Magic Logic)
      setUsers((currentUsers) => {
        // Check if user already exists
        const exists = currentUsers.find((u) => u.name === data.user);

        if (exists) {
          // If yes, update their XP
          return currentUsers.map((u) => {
            if (u.name !== data.user) return u;

            // Level Up Logic: Every 1000 XP = 1 Level
            const newXP = u.xp + data.xp;
            const newLevel = Math.floor(newXP / 1000) + 1;

            return { ...u, xp: newXP, level: newLevel };
          });
        } else {
          // If no, add them to the list
          return [...currentUsers, { name: data.user, xp: data.xp, level: 1 }];
        }
      });
    });

    return () => {
      socket.off("xp-event");
    };
  }, []);

  // Sort users by XP (Leaderboard style)
  const sortedUsers = [...users].sort((a, b) => b.xp - a.xp);

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white font-mono overflow-hidden">
      {/* LEFT PANEL: The Guild */}
      <div className="w-1/4 bg-slate-800 border-r border-slate-700 p-6 flex flex-col transition-all">
        <div className="flex items-center gap-3 mb-8 text-cyan-400">
          <Users size={32} />
          <h1 className="text-2xl font-bold tracking-widest">GUILD ROSTER</h1>
        </div>

        {users.length === 0 && (
          <div className="text-slate-500 italic text-sm">
            Waiting for heroes...
          </div>
        )}

        {sortedUsers.map((user) => (
          <div
            key={user.name}
            className="mb-4 p-4 bg-slate-700 rounded-lg flex items-center gap-4 animate-pulse-once"
          >
            {/* Avatar Circle */}
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl border-2 border-purple-400 relative">
              {user.name.charAt(0).toUpperCase()}
              {/* Level Badge */}
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-black">
                {user.level}
              </div>
            </div>

            {/* Name & Bar */}
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <h3 className="font-bold text-sm">{user.name}</h3>
                <span className="text-xs text-purple-300">{user.xp} XP</span>
              </div>
              {/* The XP Bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${(user.xp % 1000) / 10}%` }} // % of current level
                ></div>
              </div>
            </div>

            {/* Rank Icon for Top Player */}
            {sortedUsers.indexOf(user) === 0 && (
              <Trophy size={16} className="text-yellow-400" />
            )}
          </div>
        ))}
      </div>

      {/* CENTER STAGE */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
        <div className="absolute top-10 w-full text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-[0.5em]">
            SPRINT 42
          </h1>
        </div>
        <Boss hp={bossHP} maxHp={maxHP} />
      </div>

      {/* RIGHT PANEL: Battle Log */}
      <div className="w-1/4 bg-slate-800 border-l border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-8 text-purple-400">
          <Activity size={32} />
          <h1 className="text-2xl font-bold tracking-widest">BATTLE LOG</h1>
        </div>
        <div className="text-sm opacity-60 flex flex-col gap-2">
          {logs.map((log) => (
            <p key={log.id} className={log.color}>
              {log.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
