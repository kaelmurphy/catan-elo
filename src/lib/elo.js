const K = 32;

/**
 * Calculate ELO changes for a multiplayer game with teams.
 * @param {Array<{players: Array<{id: string, elo: number}>}>} teams
 * @param {number} winningTeamIndex
 * @returns {Object} { [playerId]: eloChange }
 */
export function calculateTeamEloChanges(teams, winningTeamIndex) {
  const teamElos = teams.map(team =>
    team.players.reduce((sum, p) => sum + p.elo, 0) / team.players.length
  );

  const changes = {};

  teams.forEach((team, i) => {
    const opponents = teamElos.filter((_, j) => j !== i);
    const teamElo = teamElos[i];

    const expected =
      opponents.reduce((sum, oppElo) => {
        return sum + 1 / (1 + Math.pow(10, (oppElo - teamElo) / 400));
      }, 0) / opponents.length;

    const actual = i === winningTeamIndex ? 1 : 0;
    const teamChange = Math.round(K * (actual - expected));

    team.players.forEach(player => {
      changes[player.id] = Math.round(teamChange / team.players.length);
    });
  });

  return changes;
}
