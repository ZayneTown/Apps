import { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CHORES = {
  laundry: {
    label: '🧺 Laundry',
    color: '#7BC8F6',
    accent: '#1a6fa8',
    tasks: [
      { id: 'wet_to_dry', label: 'Wet → Dryer' },
      { id: 'dry_to_hamper', label: 'Dry → Hamper' },
      { id: 'new_in_wet', label: 'New in Washer' },
    ],
  },
  dishes: {
    label: '🍽️ Dishes',
    color: '#F6C97B',
    accent: '#a87a1a',
    tasks: [
      { id: 'empty', label: 'Empty Dishwasher' },
      { id: 'load', label: 'Load Dishwasher' },
      { id: 'look_around', label: 'Collect Extras' },
    ],
  },
};

const getWeekKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  return sunday.toISOString().split('T')[0];
};

const getStorageKey = (weekKey) => `chore_tracker_${weekKey}`;

const buildEmptyWeek = () => {
  const week = {};
  for (let d = 0; d < 7; d++) {
    week[d] = { laundry: {}, dishes: {} };
    CHORES.laundry.tasks.forEach((t) => (week[d].laundry[t.id] = false));
    CHORES.dishes.tasks.forEach((t) => (week[d].dishes[t.id] = false));
  }
  return week;
};

export default function ChoreTracker() {
  const today = new Date();
  const todayDay = today.getDay();
  const weekKey = getWeekKey(today);

  const [checks, setChecks] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(weekKey));
      return saved ? JSON.parse(saved) : buildEmptyWeek();
    } catch {
      return buildEmptyWeek();
    }
  });

  const [activeDay, setActiveDay] = useState(todayDay);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(weekKey), JSON.stringify(checks));
    } catch {}
  }, [checks, weekKey]);

  const toggle = (day, category, taskId) => {
    setChecks((prev) => ({
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

  const getDayProgress = (day) => {
    let done = 0,
      total = 0;
    ['laundry', 'dishes'].forEach((cat) => {
      CHORES[cat].tasks.forEach((t) => {
        total++;
        if (checks[day]?.[cat]?.[t.id]) done++;
      });
    });
    return { done, total };
  };

  const getWeekDates = () => {
    const dates = [];
    const d = new Date(today);
    d.setDate(d.getDate() - todayDay);
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const { done: activeDone, total: activeTotal } = getDayProgress(activeDay);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        color: '#f0ede8',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: 'clamp(22px, 5vw, 32px)',
            fontWeight: '700',
            letterSpacing: '0.04em',
            margin: '0 0 4px',
            color: '#f0ede8',
            textShadow: '0 2px 12px rgba(123,200,246,0.3)',
          }}
        >
          Weekly Chores
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#8fa8c8',
            letterSpacing: '0.08em',
          }}
        >
          Week of{' '}
          {weekDates[0].toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Day Selector */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '28px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {DAYS.map((day, i) => {
          const { done, total } = getDayProgress(i);
          const isToday = i === todayDay;
          const isActive = i === activeDay;
          const allDone = done === total && total > 0;
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 10px',
                borderRadius: '10px',
                border:
                  isToday && !isActive
                    ? '1px solid rgba(123,200,246,0.4)'
                    : '1px solid transparent',
                background: isActive
                  ? 'linear-gradient(135deg, #7BC8F6 0%, #5aabdf 100%)'
                  : 'transparent',
                color: isActive ? '#0f3460' : isToday ? '#7BC8F6' : '#8fa8c8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                minWidth: '38px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                }}
              >
                {day}
              </span>
              <span style={{ fontSize: '9px' }}>{weekDates[i].getDate()}</span>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: allDone
                    ? '#5ef08a'
                    : done > 0
                    ? '#F6C97B'
                    : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.3s ease',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Day Label + Progress */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#f0ede8',
          }}
        >
          {FULL_DAYS[activeDay]}
          {activeDay === todayDay && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                background: 'rgba(123,200,246,0.2)',
                color: '#7BC8F6',
                padding: '2px 8px',
                borderRadius: '20px',
                letterSpacing: '0.06em',
              }}
            >
              today
            </span>
          )}
        </h2>
        <span style={{ fontSize: '13px', color: '#8fa8c8' }}>
          {activeDone}/{activeTotal} done
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '2px',
            width: `${(activeDone / activeTotal) * 100}%`,
            background:
              activeDone === activeTotal
                ? 'linear-gradient(90deg, #5ef08a, #3dd68c)'
                : 'linear-gradient(90deg, #7BC8F6, #F6C97B)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Chore Cards */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {Object.entries(CHORES).map(([catKey, cat]) => (
          <div
            key={catKey}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(${
                catKey === 'laundry' ? '123,200,246' : '246,201,123'
              },0.2)`,
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                padding: '12px 18px',
                background: `rgba(${
                  catKey === 'laundry' ? '123,200,246' : '246,201,123'
                },0.1)`,
                borderBottom: `1px solid rgba(${
                  catKey === 'laundry' ? '123,200,246' : '246,201,123'
                },0.15)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  letterSpacing: '0.03em',
                }}
              >
                {cat.label}
              </span>
              <span style={{ fontSize: '12px', color: cat.color }}>
                {
                  cat.tasks.filter((t) => checks[activeDay]?.[catKey]?.[t.id])
                    .length
                }
                /{cat.tasks.length}
              </span>
            </div>
            {/* Tasks */}
            <div style={{ padding: '8px 0' }}>
              {cat.tasks.map((task) => {
                const checked = checks[activeDay]?.[catKey]?.[task.id] || false;
                return (
                  <button
                    key={task.id}
                    onClick={() => toggle(activeDay, catKey, task.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '11px 18px',
                      background: checked
                        ? `rgba(${
                            catKey === 'laundry' ? '123,200,246' : '246,201,123'
                          },0.08)`
                        : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        flexShrink: 0,
                        border: checked
                          ? 'none'
                          : `2px solid rgba(${
                              catKey === 'laundry'
                                ? '123,200,246'
                                : '246,201,123'
                            },0.4)`,
                        background: checked
                          ? catKey === 'laundry'
                            ? '#7BC8F6'
                            : '#F6C97B'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {checked && (
                        <svg
                          width="12"
                          height="10"
                          viewBox="0 0 12 10"
                          fill="none"
                        >
                          <path
                            d="M1 5L4.5 8.5L11 1"
                            stroke="#0f3460"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        color: checked ? 'rgba(240,237,232,0.5)' : '#f0ede8',
                        textDecoration: checked ? 'line-through' : 'none',
                        transition: 'all 0.2s ease',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {task.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {activeDone === activeTotal && (
        <div
          style={{
            marginTop: '24px',
            padding: '14px 24px',
            background: 'rgba(94,240,138,0.1)',
            border: '1px solid rgba(94,240,138,0.3)',
            borderRadius: '12px',
            color: '#5ef08a',
            fontSize: '14px',
            textAlign: 'center',
            letterSpacing: '0.04em',
            maxWidth: '420px',
            width: '100%',
          }}
        >
          ✓ All done for {FULL_DAYS[activeDay]}!
        </div>
      )}

      <p
        style={{
          marginTop: '32px',
          fontSize: '11px',
          color: 'rgba(143,168,200,0.5)',
          letterSpacing: '0.06em',
        }}
      >
        resets each week · saved in browser
      </p>
    </div>
  );
}
