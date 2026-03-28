/** Must match server `getRankTierId` thresholds. */
export type RankTierId =
  | 'apprenticeSailor'
  | 'combatNavigator'
  | 'eliteCaptain'
  | 'fleetAdmiral'
  | 'oceanConqueror';

export function getRankTierId(elo: number): RankTierId {
  if (elo < 1000) {
    return 'apprenticeSailor';
  }
  if (elo < 1300) {
    return 'combatNavigator';
  }
  if (elo < 1600) {
    return 'eliteCaptain';
  }
  if (elo < 2000) {
    return 'fleetAdmiral';
  }
  return 'oceanConqueror';
}
