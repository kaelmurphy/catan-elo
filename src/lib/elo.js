const K = 32;

/**
 * Calculate ELO changes for a multiplayer game.
 * @param {Array<{id: string, elo: number}>} players
 * @param {string} winnerId
 * @returns {Object} { [playerId]: eloChange }
 */
export function calculateEloChanges(players, winnerId) {
  const changes = {};

  for (const player of players) {
    const opponents = players.filter(p => p.id !== player.id);

    const expected =
      opponents.reduce((sum, opp) => {
        return sum + 1 / (1 + Math.pow(10, (opp.elo - player.elo) / 400));
      }, 0) / opponents.length;

    const actual = player.id === winnerId ? 1 : 0;
    changes[player.id] = Math.round(K * (actual - expected));
  }

  return changes;
}
