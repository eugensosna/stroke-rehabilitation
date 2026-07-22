export class GameDTO {

  constructor(data:Partial<GameDTO>) {
    Object.assign(this, data);
  }

  id?: number|null;
  name?: string|null;
  statistic?: number|null;
  user?: number|null;

}
