export default function HeadToHead({ games, players }) {
  if (!games || games.length === 0 || players.length < 2) return null;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
  const ids = players.map(p => p.id);

  // Build win matrix: wins[a][b] = how many times a beat b (were in same game and a won)
  const wins = {};
  for (const a of ids) {
    wins[a] = {};
    for (const b of ids) wins[a][b] = 0;
  }

  for (const game of games) {
    if (!game.player_ids || !game.teams || game.winning_team_index == null) continue;
    const winnerIds = game.teams[game.winning_team_index] ?? [];
    const loserIds = game.player_ids.filter(id => !winnerIds.includes(id));
    for (const w of winnerIds) {
      for (const l of loserIds) {
        if (wins[w] && wins[w][l] !== undefined) wins[w][l]++;
      }
    }
  }

  // Only show players who have played each other at least once
  const activePairs = new Set();
  for (const a of ids) for (const b of ids) {
    if (a !== b && (wins[a][b] > 0 || wins[b][a] > 0)) {
      const key = [a, b].sort().join('|');
      activePairs.add(key);
    }
  }
  if (activePairs.size === 0) return null;

  // Only show players who appear in at least one pair
  const activePlayers = ids.filter(id =>
    ids.some(other => other !== id && activePairs.has([id, other].sort().join('|')))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-base font-bold text-slate-800 mb-4">Head to Head</h2>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left text-slate-400 font-medium pb-2 pr-2">vs</th>
              {activePlayers.map(id => (
                <th key={id} className="text-slate-400 font-medium pb-2 px-1 text-center whitespace-nowrap">
                  {playerMap[id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activePlayers.map(rowId => (
              <tr key={rowId} className="border-t border-slate-50">
                <td className="py-2 pr-2 font-medium text-slate-700 whitespace-nowrap">{playerMap[rowId]}</td>
                {activePlayers.map(colId => {
                  if (rowId === colId) {
                    return <td key={colId} className="py-2 px-1 text-center text-slate-200">—</td>;
                  }
                  const w = wins[rowId][colId];
                  const l = wins[colId][rowId];
                  if (w === 0 && l === 0) {
                    return <td key={colId} className="py-2 px-1 text-center text-slate-200">—</td>;
                  }
                  return (
                    <td key={colId} className="py-2 px-1 text-center">
                      <span className={`font-mono font-semibold ${w > l ? 'text-blue-600' : w < l ? 'text-red-500' : 'text-slate-400'}`}>
                        {w}–{l}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
