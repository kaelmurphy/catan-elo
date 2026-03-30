import { useState } from 'react';
import { calculateTeamEloChanges } from '../lib/elo';
import { supabase } from '../lib/supabase';

export default function RecordGame({ players, mode, eloKey, winsKey, gamesKey, seatOptions, onClose, onSubmitted }) {
  const [seatCount, setSeatCount] = useState(seatOptions[seatOptions.length - 1]);
  const [assignments, setAssignments] = useState({});
  const [winningTeam, setWinningTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function changeSeatCount(n) {
    setSeatCount(n);
    setAssignments({});
    setWinningTeam(null);
  }

  const teams = Array.from({ length: seatCount }, (_, i) => ({
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Record Game</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {seatOptions.map(n => (
            <button
              key={n}
              onClick={() => changeSeatCount(n)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition
                ${seatCount === n
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              {n}P
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-400 mb-3">
          Assign players to seats 1–{seatCount}. Multiple players per seat are teammates.
        </p>

        <div className="space-y-2 mb-4">
          {players.map(player => {
            const assigned = assignments[player.id];
            return (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                  {player.name}
                  <span className="ml-1 text-xs text-slate-400">{player[eloKey]}</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: seatCount }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => assign(player.id, num)}
                      className={`w-7 h-7 rounded text-xs font-bold transition
                        ${assigned === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'
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

        <div className={`grid gap-2 mb-4 ${seatCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {teams.map(team => (
            <div
              key={team.num}
              className={`rounded-lg p-2 text-xs border
                ${team.players.length === 0
                  ? 'border-dashed border-slate-200'
                  : 'border-slate-200 bg-slate-50'
                }`}
            >
              <span className="font-bold text-slate-400">Seat {team.num}</span>
              {team.players.length === 0
                ? <p className="text-slate-300">empty</p>
                : team.players.map(p => (
                  <p key={p.id} className="text-slate-700">{p.name}</p>
                ))
              }
            </div>
          ))}
        </div>

        {allTeamsFilled && (
          <>
            <p className="text-sm text-slate-500 mb-2">Who won?</p>
            <div className={`grid gap-2 mb-4 ${seatCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {teams.map(team => (
                <button
                  key={team.num}
                  onClick={() => setWinningTeam(team.num)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition text-left
                    ${winningTeam === team.num
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                    }`}
                >
                  {team.players.map(p => p.name).join(' + ')}
                </button>
              ))}
            </div>
          </>
        )}

        {preview && (
          <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm border border-slate-100">
            <p className="font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wide">ELO Preview</p>
            {teams.map(team => (
              <div key={team.num}>
                {team.players.length > 1 && (
                  <p className="text-xs text-slate-400 mt-1">Seat {team.num} (teammates)</p>
                )}
                {team.players.map(player => {
                  const delta = preview[player.id];
                  return (
                    <div key={player.id} className="flex justify-between py-0.5">
                      <span className="text-slate-700">{player.name}</span>
                      <span className={`font-mono font-semibold ${delta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
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
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Saving...' : 'Submit Game'}
        </button>
      </div>
    </div>
  );
}
