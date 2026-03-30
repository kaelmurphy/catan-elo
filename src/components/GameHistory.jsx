function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function GameHistory({ games, players }) {
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-base font-bold text-slate-800 mb-4">Recent Games</h2>
        <p className="text-slate-400 text-sm text-center py-6">No games recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-base font-bold text-slate-800 mb-4">Recent Games</h2>
      <ul className="space-y-3">
        {games.map(game => {
          const eloChanges = game.elo_changes;

          const winnerDisplay = game.teams
            ? game.teams[game.winning_team_index]
                .map(id => playerMap[id] ?? 'Unknown')
                .join(' + ')
            : (playerMap[game.winner_id] ?? 'Unknown');

          const summary = game.teams
            ? game.teams.map(teamIds => {
                const names = teamIds.map(id => playerMap[id] ?? 'Unknown').join('+');
                const deltas = teamIds.map(id => {
                  const d = eloChanges[id];
                  return `${d >= 0 ? '+' : ''}${d}`;
                }).join('/');
                return `${names} ${deltas}`;
              }).join(' · ')
            : game.player_ids.map(id => {
                const name = playerMap[id] ?? 'Unknown';
                const delta = eloChanges[id];
                return `${name} ${delta >= 0 ? '+' : ''}${delta}`;
              }).join(' · ');

          return (
            <li key={game.id} className="text-sm border-b border-slate-50 last:border-0 pb-3 last:pb-0">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-slate-800">
                  {winnerDisplay} won
                </span>
                <span className="text-slate-400 text-xs ml-2 shrink-0">
                  {timeAgo(game.created_at)}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">{summary}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
