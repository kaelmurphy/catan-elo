import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Leaderboard from './components/Leaderboard';
import GameHistory from './components/GameHistory';
import RecordGame from './components/RecordGame';

const GAMES = [
  {
    id: 'catan',
    label: 'Catan',
    modes: [
      { id: '4p', label: '3–4 Players', eloKey: 'elo_4p', winsKey: 'wins_4p', gamesKey: 'games_4p', seatOptions: [3, 4] },
      { id: '6p', label: '5–6 Players', eloKey: 'elo_6p', winsKey: 'wins_6p', gamesKey: 'games_6p', seatOptions: [5, 6] },
    ],
  },
  {
    id: 'ttr',
    label: 'Ticket to Ride',
    modes: [
      { id: 'ttr', label: '2–5 Players', eloKey: 'elo_ttr', winsKey: 'wins_ttr', gamesKey: 'games_ttr', seatOptions: [2, 3, 4, 5] },
    ],
  },
];

export default function App() {
  const [gameId, setGameId] = useState('catan');
  const [modeId, setModeId] = useState('4p');
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [showRecordGame, setShowRecordGame] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  const currentGame = GAMES.find(g => g.id === gameId);
  const currentMode = currentGame.modes.find(m => m.id === modeId) ?? currentGame.modes[0];

  function selectGame(id) {
    setGameId(id);
    setModeId(GAMES.find(g => g.id === id).modes[0].id);
  }

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('created_at');
    if (data) setPlayers(data);
  }

  async function fetchGames(mode) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('mode', mode)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setGames(data);
  }

  useEffect(() => { fetchPlayers(); }, []);

  useEffect(() => { fetchGames(currentMode.id); }, [currentMode.id]);

  useEffect(() => {
    const channel = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchPlayers)
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between pt-5 pb-3">
            <h1 className="text-lg font-bold text-white tracking-tight">ELO Tracker</h1>
            <button
              onClick={() => setShowRecordGame(true)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition"
            >
              + Record Game
            </button>
          </div>
          <div className="flex gap-1">
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => selectGame(g.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition
                  ${gameId === g.id
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-400 hover:text-slate-100'
                  }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {currentGame.modes.length > 1 && (
          <div className="flex gap-2">
            {currentGame.modes.map(m => (
              <button
                key={m.id}
                onClick={() => setModeId(m.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition
                  ${modeId === m.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <Leaderboard
          players={players}
          eloKey={currentMode.eloKey}
          winsKey={currentMode.winsKey}
          gamesKey={currentMode.gamesKey}
          onAddPlayer={() => setShowAddPlayer(true)}
        />

        <GameHistory games={games} players={players} />
      </main>

      {showAddPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Add Player</h2>
            <input
              autoFocus
              type="text"
              placeholder="Player name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || addingPlayer}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 transition text-sm"
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
          mode={currentMode.id}
          eloKey={currentMode.eloKey}
          winsKey={currentMode.winsKey}
          gamesKey={currentMode.gamesKey}
          seatOptions={currentMode.seatOptions}
          onClose={() => setShowRecordGame(false)}
          onSubmitted={() => fetchGames(currentMode.id)}
        />
      )}
    </div>
  );
}
