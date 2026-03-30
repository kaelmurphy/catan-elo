import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function EloChart({ eloHistory, players }) {
  if (!eloHistory || eloHistory.length === 0) return null;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
  const allPlayerIds = [...new Set(eloHistory.map(h => h.player_id))];
  const playerIds = allPlayerIds.filter(id => playerMap[id]); // exclude hidden players

  if (playerIds.length === 0) return null;

  // null = not yet in the game, set to 1200 one step before first appearance
  const currentElos = Object.fromEntries(playerIds.map(id => [id, null]));
  const hasPlayed = Object.fromEntries(playerIds.map(id => [id, false]));

  const gameIds = [...new Set(eloHistory.map(h => h.game_id))];

  const chartData = [
    { label: 'Start', ...Object.fromEntries(playerIds.map(id => [id, null])) },
  ];

  gameIds.forEach((gameId, idx) => {
    const gameEntries = eloHistory.filter(h => h.game_id === gameId && currentElos[h.player_id] !== undefined);
    gameEntries.forEach(h => {
      if (!hasPlayed[h.player_id]) {
        // Backfill 1200 into the previous data point so the line starts from there
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-base font-bold text-slate-800 mb-4">ELO History</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={42} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value, _name, props) => [value, playerMap[props.dataKey] ?? props.dataKey]}
            labelFormatter={label => label}
          />
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
  );
}
