export default function Leaderboard({ players, eloKey, winsKey, gamesKey, onAddPlayer, onEditPlayer, renderRecord }) {
  const sorted = [...players].sort((a, b) => b[eloKey] - a[eloKey]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800">Leaderboard</h2>
        {onAddPlayer && (
          <button
            onClick={onAddPlayer}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            + Add Player
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No players yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 w-8 font-medium">#</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 text-right font-medium">ELO</th>
              <th className="pb-2 text-right font-medium">W–L</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => {
              const wins = player[winsKey];
              const losses = player[gamesKey] - wins;
              return (
                <tr key={player.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                  <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
                  <td className="py-2.5 font-medium text-slate-800">{player.name}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-blue-600">
                    {player[eloKey]}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 text-xs whitespace-nowrap">
                    {renderRecord ? renderRecord(player) : `${wins}–${losses}`}
                  </td>
                  {onEditPlayer && (
                    <td className="py-2.5 pl-2">
                      <button
                        onClick={() => onEditPlayer(player)}
                        className="text-slate-300 hover:text-slate-500 transition text-xs px-1"
                      >
                        ✎
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
