import type P5 from "p5"
import GameClient from "./main"
import Gameplay from "./Gameplay"


export default class Render {
  gc: GameClient
  p5!: P5
  gameplay!: Gameplay


  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  draw() {
    const gp = this.gameplay
    const p5 = this.p5

    p5.background(20);

    p5.noFill();
    p5.stroke(200);
    p5.strokeWeight(2);

    p5.beginShape();
    for (let i = 0; i < 6; i++) {
      const deg = i * 60 + 30
      p5.vertex(p5.cos(deg) * 200 + 200, p5.sin(deg) * 200 + 300);
    }
    p5.endShape(p5.CLOSE);

  }

  click(p5: P5) {
    const gp = this.gameplay

  }
}