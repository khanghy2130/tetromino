import GameClient from "./main"
import Render from "./Render"

export default class Gameplay {
  gc: GameClient
  render!: Render

  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }


}