import { useState, useEffect } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ChoreKey = "laundry" | "dishes";

interface Task {
  id: string;
  label: string;
}

interface ChoreCategory {
  label: string;
  color: string;
  tasks: Task[];
}

type DayData = {
  [cat in ChoreKey]: Record<string, boolean>;
};

type WeekData = Record<number, DayData>;

const CHORES: Record<ChoreKey, ChoreCategory> = {
  laundry: {
    label: "🧺 Laundry",
    color: "#7BC8F6",
    tasks: [
      { id: "wet_to_dry", label: "Wet → Dryer" },
      { id: "dry_to_hamper", label: "Dry → Hamper" },
      { id: "new_in_wet", label: "New in Washer" },
    ],
  },
  dishes: {
    label: "🍽️ Dishes",
    color: "#F6C97B",
    tasks: [
      { id: "empty", label: "Empty Dishwasher" },
      { id: "load", label: "Load Dishwasher" },
      { id: "look_around", label: "Collect Extras" },
    ],
  },
};

const getSundayOf = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const getWeekKey = (sunday: Date): string => sunday.toISOString().split("T")[0];
const getStorageKey = (weekKey: string): string => `chore_tracker_${weekKey}`;

const buildEmptyWeek = (): WeekData => {
  const week: WeekData = {};
  for (let d = 0; d < 7; d++) {
    week[d] = { laundry: {}, dishes: {} };
    CHORES.laundry.tasks.forEach((t) => (week[d].laundry[t.id] = false));
    CHORES.dishes.tasks.forEach((t) => (week[d].dishes[t.id] = false));
  }
  return week;
};

const loadWeek = (weekKey: string): WeekData => {
  try {
    const saved = localStorage.getItem(getStorageKey(weekKey));
    return saved ? JSON.parse(saved) : buildEmptyWeek();
  } catch {
    return buildEmptyWeek();
  }
};

const saveWeek = (weekKey: string, data: WeekData): void => {
  try {
    localStorage.setItem(getStorageKey(weekKey), JSON.stringify(data));
  } catch {}
};

export default function ChoreTracker() {
  const today = new Date();
  const todaySunday = getSundayOf(today);
  const todayDay = today.getDay();

  const [viewSunday, setViewSunday] = useState<Date>(todaySunday);
  const [activeDay, setActiveDay] = useState<number>(todayDay);
  const [checks, setChecks] = useState<WeekData>(() => loadWeek(getWeekKey(todaySunday)));
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const weekKey = getWeekKey(viewSunday);
  const isCurrentWeek = weekKey === getWeekKey(todaySunday);

  useEffect(() => {
    setChecks(loadWeek(weekKey));
    setActiveDay(isCurrentWeek ? todayDay : 0);
  }, [weekKey]);

  useEffect(() => {
    saveWeek(weekKey, checks);
  }, [checks, weekKey]);

  const toggle = (day: number, category: ChoreKey, taskId: string) => {
    setChecks((prev: WeekData) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [category]: {
          ...prev[day][category],
          [taskId]: !prev[day][category][taskId],
        },
      },
    }));
  };

  const changeWeek = (offset: number) => {
    const newSunday = new Date(viewSunday);
    newSunday.setDate(newSunday.getDate() + offset * 7);
    if (newSunday > new Date(todaySunday.getTime() + 4 * 7 * 24 * 60 * 60 * 1000)) return;
    setViewSunday(newSunday);
  };

  const getWeekDates = (sunday: Date): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getDayProgress = (day: number) => {
    let done = 0, total = 0;
    (Object.keys(CHORES) as ChoreKey[]).forEach((cat) => {
      CHORES[cat].tasks.forEach((t) => {
        total++;
        if (checks[day]?.[cat]?.[t.id]) done++;
      });
    });
    return { done, total };
  };

  const buildWeekRows = (sunday: Date, weekData: WeekData): string[][] => {
    const dates = getWeekDates(sunday);
    const rows: string[][] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = dates[d].toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const dayName = FULL_DAYS[d];
      (Object.keys(CHORES) as ChoreKey[]).forEach((cat) => {
        CHORES[cat].tasks.forEach((task) => {
          const done = weekData[d]?.[cat]?.[task.id] ? "Yes" : "No";
          rows.push([dateStr, dayName, cat.charAt(0).toUpperCase() + cat.slice(1), task.label, done]);
        });
      });
    }
    return rows;
  };

  const downloadCSV = (scope: "week" | "all") => {
    setShowDownloadMenu(false);
    const headers = ["Date", "Day", "Category", "Task", "Completed"];
    let rows: string[][] = [headers];

    if (scope === "week") {
      rows = rows.concat(buildWeekRows(viewSunday, checks));
    } else {
      const allKeys = Object.keys(localStorage)
        .filter((k) => k.startsWith("chore_tracker_"))
        .map((k) => k.replace("chore_tracker_", ""))
        .sort();
      allKeys.forEach((key) => {
        const data = loadWeek(key);
        const sunday = new Date(key + "T00:00:00");
        rows = rows.concat(buildWeekRows(sunday, data));
      });
    }

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = scope === "week"
      ? `chores-${weekKey}.csv`
      : `chores-all-${today.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const weekDates = getWeekDates(viewSunday);
  const { done: activeDone, total: activeTotal } = getDayProgress(activeDay);

  const weekLabel = () => {
    const start = weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (isCurrentWeek) return `This week · ${start}`;
    const diff = Math.round((viewSunday.getTime() - todaySunday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (diff === -1) return `Last week · ${start}`;
    if (diff === 1) return `Next week · ${start}`;
    const end = weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${start} – ${end}`;
  };

  const navBtnStyle: React.CSSProperties = {
    width: "32px", height: "32px", borderRadius: "8px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#8fa8c8", cursor: "pointer", fontSize: "18px",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", lineHeight: 1,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 16px", color: "#f0ede8",
      }}
      onClick={() => showDownloadMenu && setShowDownloadMenu(false)}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div style={{ flex: 1 }} />
          <h1 style={{
            fontSize: "clamp(22px, 5vw, 32px)", fontWeight: "700",
            letterSpacing: "0.04em", margin: 0, color: "#f0ede8",
            textShadow: "0 2px 12px rgba(123,200,246,0.3)", flex: 1, textAlign: "center",
          }}>
            Weekly Chores
          </h1>

          {/* Download Button */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDownloadMenu((v) => !v); }}
              title="Download CSV"
              style={{
                width: "34px", height: "34px", borderRadius: "8px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#8fa8c8", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showDownloadMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute", top: "40px", right: 0, zIndex: 100,
                  background: "#16213e", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px", overflow: "hidden", minWidth: "170px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ padding: "8px 12px 6px", fontSize: "10px", color: "#5a7a9a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Download CSV
                </div>
                {(["week", "all"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => downloadCSV(key)}
                    style={{
                      width: "100%", padding: "10px 14px", textAlign: "left",
                      background: "transparent", border: "none",
                      color: "#f0ede8", cursor: "pointer", fontSize: "13px",
                      fontFamily: "inherit", display: "block",
                    }}
                  >
                    {key === "week" ? "This week only" : "All saved weeks"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Week Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
          <button onClick={() => changeWeek(-1)} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: "13px", color: "#8fa8c8", letterSpacing: "0.06em", minWidth: "190px", textAlign: "center" }}>
            {weekLabel()}
          </span>
          <button onClick={() => changeWeek(1)} style={navBtnStyle}>›</button>
        </div>
      </div>

      {/* Day Selector */}
      <div style={{
        display: "flex", gap: "6px", marginBottom: "28px",
        background: "rgba(255,255,255,0.05)", borderRadius: "16px",
        padding: "6px", border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {DAYS.map((day, i) => {
          const { done, total } = getDayProgress(i);
          const isToday = isCurrentWeek && i === todayDay;
          const isActive = i === activeDay;
          const allDone = done === total && total > 0;
          return (
            <button key={i} onClick={() => setActiveDay(i)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "4px", padding: "8px 10px", borderRadius: "10px",
              border: isToday && !isActive ? "1px solid rgba(123,200,246,0.4)" : "1px solid transparent",
              background: isActive ? "linear-gradient(135deg, #7BC8F6 0%, #5aabdf 100%)" : "transparent",
              color: isActive ? "#0f3460" : isToday ? "#7BC8F6" : "#8fa8c8",
              cursor: "pointer", transition: "all 0.2s ease",
              fontFamily: "inherit", minWidth: "38px",
            }}>
              <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.05em" }}>{day}</span>
              <span style={{ fontSize: "9px" }}>{weekDates[i].getDate()}</span>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: allDone ? "#5ef08a" : done > 0 ? "#F6C97B" : "rgba(255,255,255,0.15)",
              }} />
            </button>
          );
        })}
      </div>

      {/* Day Label + Progress */}
      <div style={{
        width: "100%", maxWidth: "420px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "16px",
      }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#f0ede8" }}>
          {FULL_DAYS[activeDay]}
          {isCurrentWeek && activeDay === todayDay && (
            <span style={{
              marginLeft: "8px", fontSize: "11px", background: "rgba(123,200,246,0.2)",
              color: "#7BC8F6", padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.06em",
            }}>today</span>
          )}
        </h2>
        <span style={{ fontSize: "13px", color: "#8fa8c8" }}>{activeDone}/{activeTotal} done</span>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: "100%", maxWidth: "420px", height: "4px",
        background: "rgba(255,255,255,0.1)", borderRadius: "2px",
        marginBottom: "20px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          width: `${(activeDone / activeTotal) * 100}%`,
          background: activeDone === activeTotal
            ? "linear-gradient(90deg, #5ef08a, #3dd68c)"
            : "linear-gradient(90deg, #7BC8F6, #F6C97B)",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Chore Cards */}
      <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {(Object.keys(CHORES) as ChoreKey[]).map((catKey) => {
          const cat = CHORES[catKey];
          return (
            <div key={catKey} style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(${catKey === "laundry" ? "123,200,246" : "246,201,123"},0.2)`,
              borderRadius: "16px", overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 18px",
                background: `rgba(${catKey === "laundry" ? "123,200,246" : "246,201,123"},0.1)`,
                borderBottom: `1px solid rgba(${catKey === "laundry" ? "123,200,246" : "246,201,123"},0.15)`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "15px", fontWeight: "600" }}>{cat.label}</span>
                <span style={{ fontSize: "12px", color: cat.color }}>
                  {cat.tasks.filter((t) => checks[activeDay]?.[catKey]?.[t.id]).length}/{cat.tasks.length}
                </span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {cat.tasks.map((task) => {
                  const checked = checks[activeDay]?.[catKey]?.[task.id] || false;
                  return (
                    <button key={task.id} onClick={() => toggle(activeDay, catKey, task.id)} style={{
                      width: "100%", display: "flex", alignItems: "center",
                      gap: "14px", padding: "11px 18px",
                      background: checked ? `rgba(${catKey === "laundry" ? "123,200,246" : "246,201,123"},0.08)` : "transparent",
                      border: "none", cursor: "pointer", color: "inherit",
                      fontFamily: "inherit", textAlign: "left", transition: "background 0.2s ease",
                    }}>
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                        border: checked ? "none" : `2px solid rgba(${catKey === "laundry" ? "123,200,246" : "246,201,123"},0.4)`,
                        background: checked ? (catKey === "laundry" ? "#7BC8F6" : "#F6C97B") : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}>
                        {checked && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1" stroke="#0f3460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontSize: "14px",
                        color: checked ? "rgba(240,237,232,0.5)" : "#f0ede8",
                        textDecoration: checked ? "line-through" : "none",
                        transition: "all 0.2s ease",
                      }}>
                        {task.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {activeDone === activeTotal && (
        <div style={{
          marginTop: "24px", padding: "14px 24px",
          background: "rgba(94,240,138,0.1)", border: "1px solid rgba(94,240,138,0.3)",
          borderRadius: "12px", color: "#5ef08a", fontSize: "14px",
          textAlign: "center", maxWidth: "420px", width: "100%",
        }}>
          ✓ All done for {FULL_DAYS[activeDay]}!
        </div>
      )}

      <p style={{ marginTop: "32px", fontSize: "11px", color: "rgba(143,168,200,0.5)", letterSpacing: "0.06em" }}>
        saved in browser · up to 4 weeks ahead
      </p>
    </div>
  );
}