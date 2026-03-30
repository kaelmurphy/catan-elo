import { useState } from 'react';
import { calculateTeamEloChanges } from '../lib/elo';
import { supabase } from '../lib/supabase';

export default function RecordGame({ players, mode, onClose, onSubmitted }) {
  const count = mode === '4p' ? 4 : 6;
  const eloKey = mode === '4p' ? 'elo_4p' : 'elo_6p';
  const winsKey = mode === '4p' ? 'wins_4p' : 'wins_6p';
  const gamesKey = mode === '4p' ? 'games_4p' : 'games_6p';

  const [assignments, setAssignments] = useState({});
  const [winningTeam, setWinningTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const teams = Array.from({ length: count }, (_, i) => ({
    num: i + 1,
    players: players.filter(p => assignments[p.id] === i + 1),
  }));

  const allTeamsFilled = teams.every(t => t.players.length > 0);

  const teamsForElo = teams.map(t => ({
    players: t.players.map(p => ({ id: p.id, elo: p[eloKey] })),
  }));

  const preview =
    allTeamsFilled && winningTeam
      ? calculateTeamEloChanges(teamsForElo, winningTeam - 1)
      : null;

  function assign(playerId, teamNum) {
    setAssignments(prev => {
      if (prev[playerId] === teamNum) {
        const next = { ...prev };
        delete next[playerId];
        return next;
      }
      return { ...prev, [playerId]: teamNum };
    });
    setWinningTeam(null);
  }

  async function handleSubmit() {
    if (!allTeamsFilled || !winningTeam) return;
    setSubmitting(true);
    setError('');

    const changes = calculateTeamEloChanges(teamsForElo, winningTeam - 1);

    for (const team of teams) {
      const isWinningTeam = team.num === winningTeam;
      for (const player of team.players) {
        const { error: err } = await supabase
          .from('players')
          .update({
            [eloKey]: player[eloKey] + changes[player.id],
            [winsKey]: isWinningTeam ? player[winsKey] + 1 : player[winsKey],
            [gamesKey]: player[gamesKey] + 1,
          })
          .eq('id', player.id);

        if (err) {
          setError('Failed to update player: ' + err.message);
          setSubmitting(false);
          return;
        }
      }
    }

    const { error: gameErr } = await supabase.from('games').insert({
      mode,
      winner_id: teams[winningTeam - 1].players[0].id,
      player_ids: teams.flatMap(t => t.players.map(p => p.id)),
      elo_changes: changes,
      teams: teams.map(t => t.players.map(p => p.id)),
      winning_team_index: winningTeam - 1,
    });

    if (gameErr) {
      setError('Failed to save game: ' + gameErr.message);
      setSubmitting(false);
      return;
    }

    onSubmitted();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Record {mode} Game</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          Assign players to seats 1–{count}. Multiple players in the same seat are teammates.
        </p>

        <div className="space-y-2 mb-4">
          {players.map(player => {
            const assigned = assignments[player.id];
            return (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                  {player.name}
                  <span className="ml-1 text-xs text-gray-400">{player[eloKey]}</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: count }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => assign(player.id, num)}
                      className={`w-7 h-7 rounded text-xs font-bold transition
                        ${assigned === num
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-amber-100'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {teams.map(team => (
            <div
              key={team.num}
              className={`rounded-lg p-2 text-xs border
                ${team.players.length === 0
                  ? 'border-dashed border-gray-200'
                  : 'border-gray-200'
                }`}
            >
              <span className="font-bold text-gray-500">Seat {team.num}</span>
              {team.players.length === 0
                ? <p className="text-gray-300">empty</p>
                : team.players.map(p => (
                  <p key={p.id} className="text-gray-700">{p.name}</p>
                ))
              }
            </div>
          ))}
        </div>

        {allTeamsFilled && (
          <>
            <p className="text-sm text-gray-500 mb-2">Who won?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {teams.map(team => (
                <button
                  key={team.num}
                  onClick={() => setWinningTeam(team.num)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition text-left
                    ${winningTeam === team.num
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                    }`}
                >
                  {team.players.map(p => p.name).join(' + ')}
                </button>
              ))}
            </div>
          </>
        )}

        {preview && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-gray-600 mb-1">ELO Preview</p>
            {teams.map(team => (
              <div key={team.num}>
                {team.players.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">Seat {team.num} (teammates)</p>
                )}
                {team.players.map(player => {
                  const delta = preview[player.id];
                  return (
                    <div key={player.id} className="flex justify-between">
                      <span className="text-gray-700">{player.name}</span>
                      <span className={delta >= 0 ? 'text-green-600 font-mono' : 'text-red-500 font-mono'}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!allTeamsFilled || !winningTeam || submitting}
          className="w-full py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Saving...' : 'Submit Game'}
        </button>
      </div>
    </div>
  );
}
