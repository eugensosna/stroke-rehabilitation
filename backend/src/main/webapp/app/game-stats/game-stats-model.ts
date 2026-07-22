export class GameStatsDTO {

  constructor(data:Partial<GameStatsDTO>) {
    Object.assign(this, data);
  }

  id?: number|null;
  start?: string|null;
  duration?: string|null;

}
