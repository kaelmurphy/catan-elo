import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import Leaderboard from './components/Leaderboard';
import GameHistory from './components/GameHistory';
import RecordGame from './components/RecordGame';
import EloChart from './components/EloChart';
import HeadToHead from './components/HeadToHead';

const GAMES = [
  {
    id: 'catan',
    label: 'Catan',
    modes: [
      {
        id: 'catan_overall',
        label: 'Overall',
        virtual: true,
        fetchModes: ['4p', '6p'],
        eloKey: 'elo_catan_overall',
        winsKey: 'wins_catan_overall',
        gamesKey: 'games_catan_overall',
        computeStats: p => {
          const games = p.games_4p + p.games_6p;
          return {
            elo: games === 0 ? 1200 : Math.round((p.elo_4p * p.games_4p + p.elo_6p * p.games_6p) / games),
            wins: p.wins_4p + p.wins_6p,
            games,
          };
        },
        renderRecord: p =>
          `4p: ${p.wins_4p}–${p.games_4p - p.wins_4p}  |  6p: ${p.wins_6p}–${p.games_6p - p.wins_6p}`,
      },
      { id: '4p', label: '3–4 Players', eloKey: 'elo_4p', winsKey: 'wins_4p', gamesKey: 'games_4p', seatOptions: [3, 4] },
      { id: '6p', label: '5–6 Players', eloKey: 'elo_6p', winsKey: 'wins_6p', gamesKey: 'games_6p', seatOptions: [5, 6] },
    ],
  },
  {
    id: 'ttr',
    label: 'Ticket to Ride',
    modes: [
      {
        id: 'ttr_overall',
        label: 'Overall',
        virtual: true,
        fetchModes: ['ttr'],
        eloKey: 'elo_ttr_overall',
        winsKey: 'wins_ttr_overall',
        gamesKey: 'games_ttr_overall',
        computeStats: p => ({
          elo: p.elo_ttr,
          wins: p.wins_ttr,
          games: p.games_ttr,
        }),
      },
      { id: 'ttr', label: '2–5 Players', hidden: true, eloKey: 'elo_ttr', winsKey: 'wins_ttr', gamesKey: 'games_ttr', seatOptions: [2, 3, 4, 5], usePlacement: true },
    ],
  },
];

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function App() {
  const [gameId, setGameId] = useState('catan');
  const [modeId, setModeId] = useState('catan_overall');
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [showRecordGame, setShowRecordGame] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);

  const currentGame = GAMES.find(g => g.id === gameId);
  const currentMode = currentGame.modes.find(m => m.id === modeId) ?? currentGame.modes[0];

  const displayPlayers = currentMode.virtual
    ? players
        .map(p => {
          const stats = currentMode.computeStats(p);
          return {
            ...p,
            [currentMode.eloKey]: stats.elo,
            [currentMode.winsKey]: stats.wins,
            [currentMode.gamesKey]: stats.games,
          };
        })
        .filter(p => p[currentMode.gamesKey] > 0)
    : players;

  const recordMode = currentMode.virtual
    ? currentGame.modes.find(m => !m.virtual)
    : currentMode;

  function selectGame(id) {
    setGameId(id);
    setModeId(GAMES.find(g => g.id === id).modes[0].id);
  }

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').eq('hidden', false).order('created_at');
    if (data) setPlayers(data);
  }

  async function fetchGames(mode) {
    const modesToFetch = mode.virtual ? mode.fetchModes : [mode.id];
    const { data } = await supabase
      .from('games')
      .select('*')
      .in('mode', modesToFetch)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setGames(data);
  }

  async function fetchAllGames(mode) {
    const modesToFetch = mode.virtual ? mode.fetchModes : [mode.id];
    const { data } = await supabase
      .from('games')
      .select('*')
      .in('mode', modesToFetch)
      .order('created_at', { ascending: false });
    if (data) setAllGames(data);
  }

  async function fetchEloHistory(mode) {
    const modesToFetch = mode.virtual ? mode.fetchModes : [mode.id];
    const { data } = await supabase
      .from('elo_history')
      .select('*')
      .in('mode', modesToFetch)
      .order('created_at', { ascending: true });
    if (data) setEloHistory(data);
  }

  async function handleUndoGame(game) {
    if (!adminUnlocked) return;
    // Reverse ELO changes
    for (const playerId of game.player_ids) {
      const player = players.find(p => p.id === playerId);
      if (!player) continue;
      const delta = game.elo_changes[playerId] ?? 0;
      const mode = game.mode;
      const eloK = currentGame.modes.find(m => m.id === mode)?.eloKey ?? recordMode.eloKey;
      const winsK = currentGame.modes.find(m => m.id === mode)?.winsKey ?? recordMode.winsKey;
      const gamesK = currentGame.modes.find(m => m.id === mode)?.gamesKey ?? recordMode.gamesKey;
      const winnerIds = game.teams ? game.teams[game.winning_team_index] : [game.winner_id];
      const wasWinner = winnerIds.includes(playerId);
      await supabase.from('players').update({
        [eloK]: player[eloK] - delta,
        [winsK]: wasWinner ? player[winsK] - 1 : player[winsK],
        [gamesK]: player[gamesK] - 1,
      }).eq('id', playerId);
    }
    await supabase.from('elo_history').delete().eq('game_id', game.id);
    await supabase.from('games').delete().eq('id', game.id);
    fetchPlayers();
    fetchGames(currentMode);
    fetchAllGames(currentMode);
    fetchEloHistory(currentMode);
  }

  const streaks = useMemo(() => {
    const result = {};
    for (const player of players) {
      let streak = 0;
      for (const game of allGames) {
        if (!game.player_ids.includes(player.id)) continue;
        const winnerIds = game.teams ? game.teams[game.winning_team_index] : [game.winner_id];
        if (winnerIds.includes(player.id)) {
          streak++;
        } else {
          break;
        }
      }
      result[player.id] = streak;
    }
    return result;
  }, [allGames, players]);

  useEffect(() => { fetchPlayers(); }, []);
  useEffect(() => {
    fetchGames(currentMode);
    fetchAllGames(currentMode);
    fetchEloHistory(currentMode);
  }, [currentMode.id]);

  useEffect(() => {
    const channel = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchPlayers)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('games-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games' }, () => {
        fetchGames(currentMode);
        fetchAllGames(currentMode);
        fetchEloHistory(currentMode);
        fetchPlayers();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentMode.id]);

  function handleAdminLogin() {
    if (adminInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setShowAdminLogin(false);
      setAdminInput('');
      setAdminError(false);
    } else {
      setAdminError(true);
    }
  }

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

  async function handleRenamePlayer() {
    const name = editName.trim();
    if (!name || !editingPlayer) return;
    await supabase.from('players').update({ name }).eq('id', editingPlayer.id);
    setEditingPlayer(null);
    fetchPlayers();
  }

  async function handleDeletePlayer() {
    if (!editingPlayer) return;
    const { error } = await supabase.from('players').update({ hidden: true }).eq('id', editingPlayer.id);
    if (error) {
      setEditError('Failed to remove player.');
      return;
    }
    setEditingPlayer(null);
    setEditError('');
    fetchPlayers();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between pt-5 pb-3">
            <h1 className="text-lg font-bold text-white tracking-tight">Hickory Boardgame Leaderboards</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRecordGame(true)}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition"
              >
                + Record Game
              </button>
              {adminUnlocked ? (
                <button
                  onClick={() => setAdminUnlocked(false)}
                  className="text-xs text-green-400 hover:text-green-300 transition font-medium"
                  title="Click to lock"
                >
                  Admin
                </button>
              ) : (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  Admin
                </button>
              )}
            </div>
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
        {currentGame.modes.filter(m => !m.hidden).length > 1 && (
          <div className="flex gap-2">
            {currentGame.modes.filter(m => !m.hidden).map(m => (
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
          players={displayPlayers}
          eloKey={currentMode.eloKey}
          winsKey={currentMode.winsKey}
          gamesKey={currentMode.gamesKey}
          onAddPlayer={() => setShowAddPlayer(true)}
          onEditPlayer={adminUnlocked ? p => { setEditingPlayer(p); setEditName(p.name); setEditError(''); } : null}
          renderRecord={currentMode.renderRecord}
          streaks={streaks}
        />

        <EloChart eloHistory={eloHistory} players={players} />

        <HeadToHead games={allGames} players={displayPlayers} />

        <GameHistory
          games={games}
          players={players}
          onUndo={adminUnlocked ? handleUndoGame : null}
        />
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Admin</h2>
            <p className="text-sm text-slate-400 mb-4">Enter your password to unlock admin controls.</p>
            <input
              autoFocus
              type="password"
              placeholder="Password"
              value={adminInput}
              onChange={e => { setAdminInput(e.target.value); setAdminError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-1 transition
                ${adminError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'
                }`}
            />
            {adminError && <p className="text-red-500 text-xs mb-3">Incorrect password.</p>}
            {!adminError && <div className="mb-3" />}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdminLogin(false); setAdminInput(''); setAdminError(false); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition text-sm"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

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

      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Player</h2>
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenamePlayer()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRenamePlayer}
                disabled={!editName.trim()}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 transition text-sm"
              >
                Save
              </button>
            </div>
            <button
              onClick={handleDeletePlayer}
              className="w-full py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition text-sm"
            >
              Delete Player
            </button>
            {editError && <p className="text-red-500 text-xs mt-2 text-center">{editError}</p>}
          </div>
        </div>
      )}

      {showRecordGame && (
        <RecordGame
          players={players}
          mode={recordMode.id}
          eloKey={recordMode.eloKey}
          winsKey={recordMode.winsKey}
          gamesKey={recordMode.gamesKey}
          seatOptions={recordMode.seatOptions}
          usePlacement={recordMode.usePlacement ?? false}
          onClose={() => setShowRecordGame(false)}
          onSubmitted={() => fetchGames(currentMode)}
        />
      )}
    </div>
  );
}
