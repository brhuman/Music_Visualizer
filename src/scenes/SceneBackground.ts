import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

export class SceneBackground extends BaseScene {
  private grid!: PIXI.Graphics;
  private energy: number = 0;

  constructor() {
    super('scene-background', 'Global Environment');
  }

  protected onInit(): void {
    this.grid = new PIXI.Graphics();
    this.container.addChild(this.grid);
  }

  protected onStart(): void {
    // Listen to every quarter note to pulse the grid
    Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        this.energy = 1.0;
      }, time);
    }, "4n");
  }

  protected onStop(): void {
    this.grid.clear();
  }

  public update(deltaTime: number): void {
    this.energy *= Math.pow(0.92, deltaTime);
    
    this.grid.clear();
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;
    const spacing = 50;

    const alpha = 0.05 + this.energy * 0.15;
    
    // Vertical lines
    for (let x = 0; x <= w; x += spacing) {
      this.grid.moveTo(x, 0);
      this.grid.lineTo(x, h);
    }
    // Horizontal lines
    for (let y = 0; y <= h; y += spacing) {
      this.grid.moveTo(0, y);
      this.grid.lineTo(w, y);
    }
    
    this.grid.stroke({ width: 1, color: 0x00ffff, alpha });
  }

  public setParameters(_params: any): void {}
}
