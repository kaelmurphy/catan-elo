import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MODE_LABELS = { '4p': 'Catan 3–4p', '6p': 'Catan 5–6p', 'ttr': 'TTR' };

function StatBlock({ label, elo, wins, games }) {
  if (games === 0) return null;
  const losses = games - wins;
  const winPct = Math.round((wins / games) * 100);
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-blue-600 font-mono">{elo}</span>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">{wins}–{losses}</p>
          <p className="text-xs text-slate-400">{winPct}% win rate</p>
        </div>
      </div>
    </div>
  );
}

export default function PlayerProfile({ player, house, onClose }) {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .contains('player_ids', [player.id])
        .eq('house', house)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setRecentGames(data);
      setLoading(false);
    }
    fetchGames();
  }, [player.id, house]);

  const totalGames = player.games_4p + player.games_6p + player.games_ttr;
  const totalWins = player.wins_4p + player.wins_6p + player.wins_ttr;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{player.name}</h2>
            <p className="text-sm text-slate-400">{totalGames} games · {totalWins} wins</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-1">×</button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Catan</p>
          <StatBlock label="3–4 Players" elo={player.elo_4p} wins={player.wins_4p} games={player.games_4p} />
          <StatBlock label="5–6 Players" elo={player.elo_6p} wins={player.wins_6p} games={player.games_6p} />
          {player.games_4p === 0 && player.games_6p === 0 && (
            <p className="text-sm text-slate-400 pl-1">No Catan games yet.</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ticket to Ride</p>
          <StatBlock label="TTR" elo={player.elo_ttr} wins={player.wins_ttr} games={player.games_ttr} />
          {player.games_ttr === 0 && (
            <p className="text-sm text-slate-400 pl-1">No TTR games yet.</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Games</p>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
          ) : recentGames.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No games yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recentGames.map(game => {
                const winnerIds = game.teams ? game.teams[game.winning_team_index] : [game.winner_id];
                const won = winnerIds.includes(player.id);
                const delta = game.elo_changes?.[player.id] ?? 0;
                const date = new Date(game.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <li key={game.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${won ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {won ? 'W' : 'L'}
                      </span>
                      <span className="text-slate-600">{MODE_LABELS[game.mode] ?? game.mode}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-semibold text-xs ${delta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                      <span className="text-slate-400 text-xs">{date}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
