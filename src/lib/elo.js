const K = 32;

/**
 * Zero-sum pairwise ELO for teams.
 * Winner gains K*(1-E) against each losing team.
 * Each loser loses exactly what the winner gains from them.
 * Teammates split their team's change equally.
 *
 * @param {Array<{players: Array<{id: string, elo: number}>}>} teams
 * @param {number} winningTeamIndex
 * @returns {Object} { [playerId]: eloChange }
 */
export function calculateTeamEloChanges(teams, winningTeamIndex) {
  const changes = {};
  teams.forEach(team => team.players.forEach(p => { changes[p.id] = 0; }));

  const winningTeam = teams[winningTeamIndex];
  const winningElo =
    winningTeam.players.reduce((s, p) => s + p.elo, 0) / winningTeam.players.length;

  teams.forEach((team, i) => {
    if (i === winningTeamIndex) return;

    const losingElo =
      team.players.reduce((s, p) => s + p.elo, 0) / team.players.length;

    const expected = 1 / (1 + Math.pow(10, (losingElo - winningElo) / 400));
    const gain = Math.round(K * (1 - expected));

    winningTeam.players.forEach(p => {
      changes[p.id] += Math.round(gain / winningTeam.players.length);
    });
    team.players.forEach(p => {
      changes[p.id] -= Math.round(gain / team.players.length);
    });
  });

  return changes;
}
