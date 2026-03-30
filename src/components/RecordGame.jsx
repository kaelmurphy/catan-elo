import { useState } from 'react';
import { calculateEloChanges } from '../lib/elo';
import { supabase } from '../lib/supabase';

export default function RecordGame({ players, mode, onClose, onSubmitted }) {
  const count = mode === '4p' ? 4 : 6;
  const eloKey = mode === '4p' ? 'elo_4p' : 'elo_6p';
  const winsKey = mode === '4p' ? 'wins_4p' : 'wins_6p';
  const gamesKey = mode === '4p' ? 'games_4p' : 'games_6p';

  const [selected, setSelected] = useState([]);
  const [winnerId, setWinnerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function togglePlayer(player) {
    setSelected(prev => {
      if (prev.find(p => p.id === player.id)) {
        const next = prev.filter(p => p.id !== player.id);
        if (winnerId === player.id) setWinnerId('');
        return next;
      }
      if (prev.length >= count) return prev;
      return [...prev, player];
    });
  }

  const selectedForElo = selected.map(p => ({ id: p.id, elo: p[eloKey] }));
  const preview =
    selected.length === count && winnerId
      ? calculateEloChanges(selectedForElo, winnerId)
      : null;

  async function handleSubmit() {
    if (selected.length !== count || !winnerId) return;
    setSubmitting(true);
    setError('');

    const changes = calculateEloChanges(selectedForElo, winnerId);

    for (const player of selected) {
      const { error: err } = await supabase
        .from('players')
        .update({
          [eloKey]: player[eloKey] + changes[player.id],
          [winsKey]: player.id === winnerId ? player[winsKey] + 1 : player[winsKey],
          [gamesKey]: player[gamesKey] + 1,
        })
        .eq('id', player.id);

      if (err) {
        setError('Failed to update player: ' + err.message);
        setSubmitting(false);
        return;
      }
    }

    const { error: gameErr } = await supabase.from('games').insert({
      mode,
      winner_id: winnerId,
      player_ids: selected.map(p => p.id),
      elo_changes: changes,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Record {mode} Game</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Select {count} players ({selected.length}/{count})
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {players.map(player => {
            const isSelected = !!selected.find(p => p.id === player.id);
            const disabled = !isSelected && selected.length >= count;
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition
                  ${isSelected
                    ? 'bg-amber-500 text-white border-amber-500'
                    : disabled
                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400'
                  }`}
              >
                {player.name}
                <span className="ml-1 text-xs opacity-70">{player[eloKey]}</span>
              </button>
            );
          })}
        </div>

        {selected.length === count && (
          <>
            <p className="text-sm text-gray-500 mb-2">Who won?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {selected.map(player => (
                <button
                  key={player.id}
                  onClick={() => setWinnerId(player.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition
                    ${winnerId === player.id
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                    }`}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </>
        )}

        {preview && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-gray-600 mb-1">ELO Preview</p>
            {selected.map(player => {
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
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={selected.length !== count || !winnerId || submitting}
          className="w-full py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Saving...' : 'Submit Game'}
        </button>
      </div>
    </div>
  );
}
