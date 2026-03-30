import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Leaderboard from './components/Leaderboard';
import GameHistory from './components/GameHistory';
import RecordGame from './components/RecordGame';

export default function App() {
  const [mode, setMode] = useState('4p');
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [showRecordGame, setShowRecordGame] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('created_at');
    if (data) setPlayers(data);
  }

  async function fetchGames(currentMode) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('mode', currentMode)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setGames(data);
  }

  useEffect(() => {
    fetchPlayers();
    fetchGames(mode);
  }, [mode]);

  useEffect(() => {
    const channel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setAddingPlayer(true);
    await supabase.from('players').insert({ name });
    setNewPlayerName('');
    setShowAddPlayer(false);
    setAddingPlayer(false);
    fetchPlayers();
  }

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900">
      <header className="bg-amber-600 text-white py-4 px-4 shadow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Catan ELO</h1>
          <button
            onClick={() => setShowRecordGame(true)}
            className="px-4 py-1.5 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition text-sm"
          >
            + Record Game
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          {['4p', '6p'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition
                ${mode === m
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-400'
                }`}
            >
              {m === '4p' ? '4 Players' : '6 Players'}
            </button>
          ))}
        </div>

        <Leaderboard
          players={players}
          mode={mode}
          onAddPlayer={() => setShowAddPlayer(true)}
        />

        <GameHistory games={games} players={players} />
      </main>

      {showAddPlayer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add Player</h2>
            <input
              autoFocus
              type="text"
              placeholder="Player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-amber-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || addingPlayer}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-40 transition text-sm"
              >
                {addingPlayer ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecordGame && (
        <RecordGame
          players={players}
          mode={mode}
          onClose={() => setShowRecordGame(false)}
          onSubmitted={() => fetchGames(mode)}
        />
      )}
    </div>
  );
}
