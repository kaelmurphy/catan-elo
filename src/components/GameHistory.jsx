import { useState } from 'react';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtDelta(d) {
  return `${d >= 0 ? '+' : ''}${d}`;
}

function buildSummary(game, playerMap) {
  const { elo_changes: eloChanges, ranked_team_indices, teams, player_ids } = game;

  if (ranked_team_indices && teams) {
    return ranked_team_indices.map((teamIdx, place) => {
      const names = teams[teamIdx].map(id => playerMap[id] ?? 'Unknown').join('+');
      const deltas = teams[teamIdx].map(id => fmtDelta(eloChanges[id])).join('/');
      return `${ORDINALS[place] ?? `${place + 1}th`}: ${names} ${deltas}`;
    }).join(',  ');
  }

  if (teams) {
    return teams.map(teamIds => {
      const names = teamIds.map(id => playerMap[id] ?? 'Unknown').join('+');
      const deltas = teamIds.map(id => fmtDelta(eloChanges[id])).join('/');
      return `${names} ${deltas}`;
    }).join(',  ');
  }

  return player_ids.map(id => `${playerMap[id] ?? 'Unknown'} ${fmtDelta(eloChanges[id])}`).join(',  ');
}

function GameList({ games, playerMap, onUndo, isFirst }) {
  return (
    <ul className="space-y-3">
      {games.map(game => {
        const winnerDisplay = game.teams
          ? game.teams[game.winning_team_index].map(id => playerMap[id] ?? 'Unknown').join(' + ')
          : (playerMap[game.winner_id] ?? 'Unknown');
        const isLatest = isFirst && game.id === games[0].id;
        return (
          <li key={game.id} className="text-sm border-b border-slate-50 last:border-0 pb-3 last:pb-0">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-slate-800">{winnerDisplay} won</span>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-slate-400 text-xs">{timeAgo(game.created_at)}</span>
                {onUndo && isLatest && (
                  <button onClick={() => onUndo(game)}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                    title="Undo this game">
                    Undo
                  </button>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{buildSummary(game, playerMap)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function GameHistory({ games, players, onUndo }) {
  const [showModal, setShowModal] = useState(false);
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
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-base font-bold text-slate-800 mb-4">Recent Games</h2>
        <GameList games={games.slice(0, 3)} playerMap={playerMap} onUndo={onUndo} isFirst={true} />
        {games.length > 3 && (
          <button onClick={() => setShowModal(true)}
            className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 transition py-1">
            Show all {games.length} games
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800">All Games</h2>
              <button onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none">
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <GameList games={games} playerMap={playerMap} onUndo={onUndo} isFirst={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
