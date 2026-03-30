export default function Leaderboard({ players, mode, onAddPlayer }) {
  const eloKey = mode === '4p' ? 'elo_4p' : 'elo_6p';
  const winsKey = mode === '4p' ? 'wins_4p' : 'wins_6p';
  const gamesKey = mode === '4p' ? 'games_4p' : 'games_6p';

  const sorted = [...players].sort((a, b) => b[eloKey] - a[eloKey]);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Leaderboard</h2>
        <button
          onClick={onAddPlayer}
          className="text-sm px-3 py-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
        >
          + Add Player
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No players yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2 w-8">#</th>
              <th className="pb-2">Name</th>
              <th className="pb-2 text-right">ELO</th>
              <th className="pb-2 text-right">Record</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => {
              const wins = player[winsKey];
              const games = player[gamesKey];
              const losses = games - wins;
              return (
                <tr key={player.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 font-medium text-gray-800">{player.name}</td>
                  <td className="py-2 text-right font-mono font-bold text-amber-700">
                    {player[eloKey]}
                  </td>
                  <td className="py-2 text-right text-gray-500">
                    {wins}W · {losses}L
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
