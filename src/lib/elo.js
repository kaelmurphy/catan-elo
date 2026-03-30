/**
 * Dynamic K-factor based on games played in this mode.
 *   0–4 games:  K=64  (provisional)
 *   5–14 games: K=40  (developing)
 *   15+ games:  K=24  (established)
 */
function kFactor(games) {
  if (games < 5) return 64;
  if (games < 15) return 40;
  return 24;
}

function avgElo(players) {
  return players.reduce((s, p) => s + p.elo, 0) / players.length;
}

function avgK(players) {
  return players.reduce((s, p) => s + kFactor(p.games), 0) / players.length;
}

function applyPairwise(changes, higherTeam, lowerTeam, expected) {
  const gain = Math.round(avgK(higherTeam.players) * (1 - expected));
  const loss = Math.round(avgK(lowerTeam.players) * (1 - expected));
  higherTeam.players.forEach(p => {
    changes[p.id] += Math.round(gain / higherTeam.players.length);
  });
  lowerTeam.players.forEach(p => {
    changes[p.id] -= Math.round(loss / lowerTeam.players.length);
  });
}

/**
 * Pairwise ELO: winner gains against each loser individually.
 * Used for Catan (binary win/loss).
 *
 * @param {Array<{players: Array<{id: string, elo: number, games: number}>}>} teams
 * @param {number} winningTeamIndex
 * @returns {Object} { [playerId]: eloChange }
 */
export function calculateTeamEloChanges(teams, winningTeamIndex) {
  const changes = {};
  teams.forEach(team => team.players.forEach(p => { changes[p.id] = 0; }));

  const winningTeam = teams[winningTeamIndex];

  teams.forEach((team, i) => {
    if (i === winningTeamIndex) return;
    const expected = 1 / (1 + Math.pow(10, (avgElo(team.players) - avgElo(winningTeam.players)) / 400));
    applyPairwise(changes, winningTeam, team, expected);
  });

  return changes;
}

/**
 * All-pairs placement ELO: every finishing position is compared against
 * every lower position. Used for Ticket to Ride.
 *
 * @param {Array<{players: Array<{id: string, elo: number, games: number}>}>} teams
 * @param {number[]} rankedTeamIndices - team indices from 1st to last place
 * @returns {Object} { [playerId]: eloChange }
 */
export function calculatePlacementEloChanges(teams, rankedTeamIndices) {
  const changes = {};
  teams.forEach(team => team.players.forEach(p => { changes[p.id] = 0; }));

  for (let i = 0; i < rankedTeamIndices.length; i++) {
    for (let j = i + 1; j < rankedTeamIndices.length; j++) {
      const higher = teams[rankedTeamIndices[i]];
      const lower = teams[rankedTeamIndices[j]];
      const expected = 1 / (1 + Math.pow(10, (avgElo(lower.players) - avgElo(higher.players)) / 400));
      applyPairwise(changes, higher, lower, expected);
    }
  }

  return changes;
}
