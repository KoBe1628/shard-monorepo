import { useState, useEffect } from "react";
import Boss from "./Boss";
import DamageNumber, { type DamageInstance } from "./DamageNumber";
import { Users, Activity, Trophy, Shield, Sword, Sparkles } from "lucide-react";
import io from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const socket = io(BACKEND_URL);

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
  class: string;
}

function App() {
  // BOSS STATE (Now dynamic!)
  const [bossName, setBossName] = useState("LOADING...");
  const [bossHP, setBossHP] = useState(0);
  const [maxHP, setMaxHP] = useState(1); // Default to 1 to avoid divide-by-zero errors

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // JUICE STATE 🧃
  const [damages, setDamages] = useState<DamageInstance[]>([]);
  const [isHit, setIsHit] = useState(false);

  useEffect(() => {
    // 1. FETCH HISTORY AND BOSS STATE
    const fetchInitialData = async () => {
      try {
        // Fetch Users
        const userRes = await fetch(`${BACKEND_URL}/users`);
        const userData = await userRes.json();
        if (Array.isArray(userData)) {
          const sorted = userData.sort((a: User, b: User) => b.xp - a.xp);
          const typedUsers = sorted.map((u) => ({
            ...u,
            class: u.class || "Novice",
          }));
          setUsers(typedUsers);
        }

        // Fetch Boss
        const bossRes = await fetch(`${BACKEND_URL}/boss`);
        const bossData = await bossRes.json();
        if (bossData && bossData.name) {
          setBossName(bossData.name);
          setBossHP(bossData.hp);
          setMaxHP(bossData.max_hp);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };

    fetchInitialData();

    // 2. LISTEN FOR NEW EVENTS
    socket.on("xp-event", (data) => {
      // Update Boss from the server's exact math
      if (data.boss) {
        setBossName(data.boss.name);
        setBossHP(data.boss.hp);
        setMaxHP(data.boss.max_hp);
      } else {
        // Fallback just in case
        setBossHP((prev) => Math.max(0, prev - data.xp));
      }

      setIsHit(true);
      setTimeout(() => setIsHit(false), 500);

      const newDamage: DamageInstance = {
        id: Date.now(),
        value: data.xp,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 50,
      };
      setDamages((prev) => [...prev, newDamage]);

      const newLog = {
        id: Date.now(),
        text: `> ${data.user} ${data.message} (+${data.xp} XP)`,
        color: "text-green-400",
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 5));

      setUsers((currentUsers) => {
        const exists = currentUsers.find((u) => u.name === data.user);
        if (exists) {
          return currentUsers.map((u) => {
            if (u.name !== data.user) return u;
            const newXP = u.xp + data.xp;
            const newLevel = Math.floor(newXP / 1000) + 1;
            return {
              ...u,
              xp: newXP,
              level: newLevel,
              class: data.class || u.class,
            };
          });
        } else {
          return [
            ...currentUsers,
            {
              name: data.user,
              xp: data.xp,
              level: 1,
              class: data.class || "Novice",
            },
          ];
        }
      });
    });

    return () => {
      socket.off("xp-event");
    };
  }, []);

  const sortedUsers = [...users].sort((a, b) => b.xp - a.xp);

  const removeDamage = (id: number) => {
    setDamages((prev) => prev.filter((d) => d.id !== id));
  };

  const getClassIcon = (userClass: string) => {
    if (userClass === "Paladin")
      return <Shield size={16} className="text-blue-400" />;
    if (userClass === "Rogue")
      return <Sword size={16} className="text-red-400" />;
    return <Sparkles size={16} className="text-gray-400" />;
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white font-mono overflow-hidden">
      {/* LEFT PANEL */}
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
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl border-2 border-purple-400 relative">
              {user.name.charAt(0).toUpperCase()}
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-black">
                {user.level}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  {user.name}
                  <span title={user.class}>{getClassIcon(user.class)}</span>
                </h3>
                <span className="text-xs text-purple-300">{user.xp} XP</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${(user.xp % 1000) / 10}%` }}
                ></div>
              </div>
            </div>
            {sortedUsers.indexOf(user) === 0 && (
              <Trophy size={16} className="text-yellow-400" />
            )}
          </div>
        ))}
      </div>

      {/* CENTER STAGE */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
        <div className="absolute top-10 w-full text-center">
          {/* THE DYNAMIC BOSS NAME! */}
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-[0.2em] uppercase">
            {bossName}
          </h1>
        </div>

        <Boss hp={bossHP} maxHp={maxHP} isHit={isHit} />
        <DamageNumber damages={damages} onComplete={removeDamage} />
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/4 bg-slate-800 border-l border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-8 text-purple-400">
          <Activity size={32} />
          <h1 className="text-2xl font-bold tracking-widest">BATTLE LOG</h1>
        </div>
        <div className="text-sm opacity-60 flex flex-col gap-2 overflow-y-auto max-h-[80vh]">
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
