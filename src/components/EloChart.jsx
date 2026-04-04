import { useState, useRef, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function buildChartData(eloHistory, playerIds, mode) {
  const gameIds = [...new Set(eloHistory.map(h => h.game_id))];
  const hasPlayed = Object.fromEntries(playerIds.map(id => [id, false]));
  const startRow = { label: 'Start', ...Object.fromEntries(playerIds.map(id => [id, null])) };

  if (mode?.virtual && mode.fetchModes) {
    const { fetchModes } = mode;
    const playerModeState = Object.fromEntries(
      playerIds.map(id => [id, Object.fromEntries(fetchModes.map(m => [m, { elo: 1200, games: 0 }]))])
    );
    const computeOverall = id => {
      const state = playerModeState[id];
      const totalGames = fetchModes.reduce((sum, m) => sum + state[m].games, 0);
      if (totalGames === 0) return 1200;
      return Math.round(fetchModes.reduce((sum, m) => sum + state[m].elo * state[m].games, 0) / totalGames);
    };
    const data = [{ ...startRow }];
    gameIds.forEach((gameId, idx) => {
      eloHistory
        .filter(h => h.game_id === gameId && playerModeState[h.player_id]?.[h.mode])
        .forEach(h => {
          if (!hasPlayed[h.player_id]) {
            data[data.length - 1][h.player_id] = computeOverall(h.player_id);
            hasPlayed[h.player_id] = true;
          }
          playerModeState[h.player_id][h.mode].elo = h.elo;
          playerModeState[h.player_id][h.mode].games += 1;
        });
      data.push({ label: `G${idx + 1}`, ...Object.fromEntries(playerIds.map(id => [id, hasPlayed[id] ? computeOverall(id) : null])) });
    });
    return data;
  }

  const currentElos = Object.fromEntries(playerIds.map(id => [id, null]));
  const data = [{ ...startRow }];
  gameIds.forEach((gameId, idx) => {
    eloHistory
      .filter(h => h.game_id === gameId && currentElos[h.player_id] !== undefined)
      .forEach(h => {
        if (!hasPlayed[h.player_id]) {
          data[data.length - 1][h.player_id] = 1200;
          hasPlayed[h.player_id] = true;
        }
        currentElos[h.player_id] = h.elo;
      });
    data.push({ label: `G${idx + 1}`, ...Object.fromEntries(playerIds.map(id => [id, currentElos[id]])) });
  });
  return data;
}

export default function EloChart({ eloHistory, players, mode }) {
  const [activePoint, setActivePoint] = useState(null);
  const playerMapRef = useRef({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tooltipContent = useCallback(({ active, payload, label }) => {
    requestAnimationFrame(() => {
      if (active && payload?.length) {
        const entries = payload
          .filter(p => p.value != null)
          .map(p => ({ id: p.dataKey, name: playerMapRef.current[p.dataKey] ?? p.dataKey, elo: p.value }))
          .sort((a, b) => b.elo - a.elo);
        setActivePoint({ label, entries });
      } else {
        setActivePoint(null);
      }
    });
    return null;
  }, []);

  const playerMap = useMemo(() => Object.fromEntries(players.map(p => [p.id, p.name])), [players]);
  playerMapRef.current = playerMap;

  const playerIds = useMemo(
    () => [...new Set(eloHistory.map(h => h.player_id))].filter(id => playerMap[id]),
    [eloHistory, playerMap]
  );

  const chartData = useMemo(
    () => (eloHistory.length && playerIds.length) ? buildChartData(eloHistory, playerIds, mode) : null,
    [eloHistory, playerIds, mode]
  );

  const colorMap = useMemo(
    () => Object.fromEntries(playerIds.map((id, i) => [id, COLORS[i % COLORS.length]])),
    [playerIds]
  );

  if (!chartData) return null;

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
              <Legend formatter={id => playerMap[id] ?? id} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
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
