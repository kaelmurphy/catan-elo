import { useState, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function EloChart({ eloHistory, players, mode }) {
  const [activePoint, setActivePoint] = useState(null);
  const playerMapRef = useRef({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tooltipContent = useCallback(({ active, payload, label }) => {
    requestAnimationFrame(() => {
      if (active && payload?.length) {
        const entries = payload
          .filter(p => p.value != null)
          .map(p => ({
            id: p.dataKey,
            name: playerMapRef.current[p.dataKey] ?? p.dataKey,
            elo: p.value,
          }))
          .sort((a, b) => b.elo - a.elo);
        setActivePoint({ label, entries });
      } else {
        setActivePoint(null);
      }
    });
    return null;
  }, []); // stable reference — reads playerMap via ref

  if (!eloHistory || eloHistory.length === 0) return null;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
  playerMapRef.current = playerMap;

  const allPlayerIds = [...new Set(eloHistory.map(h => h.player_id))];
  const playerIds = allPlayerIds.filter(id => playerMap[id]);

  if (playerIds.length === 0) return null;

  const gameIds = [...new Set(eloHistory.map(h => h.game_id))];
  const hasPlayed = Object.fromEntries(playerIds.map(id => [id, false]));

  let chartData;

  if (mode?.virtual && mode.fetchModes) {
    const fetchModes = mode.fetchModes;
    const playerModeState = {};
    playerIds.forEach(id => {
      playerModeState[id] = {};
      fetchModes.forEach(m => { playerModeState[id][m] = { elo: 1200, games: 0 }; });
    });

    const computeOverall = (id) => {
      const state = playerModeState[id];
      const totalGames = fetchModes.reduce((sum, m) => sum + state[m].games, 0);
      if (totalGames === 0) return 1200;
      const weightedSum = fetchModes.reduce((sum, m) => sum + state[m].elo * state[m].games, 0);
      return Math.round(weightedSum / totalGames);
    };

    chartData = [{ label: 'Start', ...Object.fromEntries(playerIds.map(id => [id, null])) }];

    gameIds.forEach((gameId, idx) => {
      const gameEntries = eloHistory.filter(h => h.game_id === gameId && playerModeState[h.player_id] && playerModeState[h.player_id][h.mode]);
      gameEntries.forEach(h => {
        if (!hasPlayed[h.player_id]) {
          chartData[chartData.length - 1][h.player_id] = computeOverall(h.player_id);
          hasPlayed[h.player_id] = true;
        }
        playerModeState[h.player_id][h.mode].elo = h.elo;
        playerModeState[h.player_id][h.mode].games += 1;
      });
      chartData.push({
        label: `G${idx + 1}`,
        ...Object.fromEntries(playerIds.map(id => [id, hasPlayed[id] ? computeOverall(id) : null])),
      });
    });
  } else {
    const currentElos = Object.fromEntries(playerIds.map(id => [id, null]));

    chartData = [{ label: 'Start', ...Object.fromEntries(playerIds.map(id => [id, null])) }];

    gameIds.forEach((gameId, idx) => {
      const gameEntries = eloHistory.filter(h => h.game_id === gameId && currentElos[h.player_id] !== undefined);
      gameEntries.forEach(h => {
        if (!hasPlayed[h.player_id]) {
          chartData[chartData.length - 1][h.player_id] = 1200;
          hasPlayed[h.player_id] = true;
        }
        currentElos[h.player_id] = h.elo;
      });
      chartData.push({
        label: `G${idx + 1}`,
        ...Object.fromEntries(playerIds.map(id => [id, currentElos[id]])),
      });
    });
  }

  const colorMap = Object.fromEntries(playerIds.map((id, i) => [id, COLORS[i % COLORS.length]]));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-base font-bold text-slate-800 mb-4">ELO History</h2>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={42} />
              <Tooltip content={tooltipContent} />
              <Legend
                formatter={id => playerMap[id] ?? id}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {playerIds.map((id, i) => (
                <Line
                  key={id}
                  type="linear"
                  dataKey={id}
                  name={playerMap[id]}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="w-36 shrink-0 flex flex-col justify-center">
          {activePoint && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">{activePoint.label}</div>
              <div className="flex flex-col gap-1">
                {activePoint.entries.map(({ id, name, elo }) => (
                  <div key={id} className="flex justify-between items-center gap-2">
                    <span className="text-xs font-medium truncate" style={{ color: colorMap[id] }}>{name}</span>
                    <span className="text-xs text-slate-700 font-mono shrink-0">{elo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
