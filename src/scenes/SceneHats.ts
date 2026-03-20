import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface HatVisual {
  graphics: PIXI.Graphics;
  life: number;
  vx: number;
  vy: number;
}

export class SceneHats extends BaseScene {
  private synth!: Tone.NoiseSynth;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: HatVisual[] = [];
  
  private speedMultiplier: number = 1.0;
  private currentVariation: number = 0;
  private colors = [0x00FF9F, 0xFFFFFF, 0x00D4FF, 0xFF0055]; // Flat Neon 2026

  constructor() {
    super('scene-hats', 'Hi-Hats');
  }

  protected onInit(): void {
    this.filter = this.registerNode(
      new Tone.Filter(4000, 'highpass').connect(this.audioChannel)
    );
    this.synth = this.registerNode(
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, release: 0.05 }
      }).connect(this.filter)
    );
    this.seq = this.registerNode(
      new Tone.Sequence((time) => {
          const decay = (0.01 + Math.random() * 0.05) * this.speedMultiplier;
          this.synth.envelope.decay = decay;
          this.synth.triggerAttackRelease(decay, time);
          Tone.Draw.schedule(() => {
            this.spawnVisual();
          }, time);
      }, [0, 1], "8n")
    );
  }

  protected onStart(): void {
    this.seq.start(0);
  }

  protected onStop(): void {
    this.seq.stop();
    this.visuals.forEach(v => v.graphics.destroy());
    this.visuals = [];
  }

  public update(deltaTime: number): void {
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      v.life -= deltaTime * 0.05;
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        v.graphics.x += v.vx * deltaTime;
        v.graphics.y += v.vy * deltaTime;
        // Faster fade out but larger starting point
        v.graphics.scale.set(v.life * 1.5); 
        v.graphics.alpha = v.life * 0.8;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.speed !== undefined) {
      this.speedMultiplier = params.speed;
    }
    if (params.pitch !== undefined) {
      this.filter.set({ frequency: params.pitch * 20, type: 'highpass' });
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      
      // Robust State Reset
      const presets = [
        { decay: 0.04, filter: 8000 }, // Closed
        { decay: 0.25, filter: 3000 }, // Open
        { decay: 0.01, filter: 10000 }, // Sharp/Tick
        { decay: 0.08, filter: 2000 }  // Shaker/Soft
      ];
      const p = presets[v % presets.length];
      this.synth.envelope.set({ decay: p.decay });
      this.filter.set({ frequency: p.filter, type: 'highpass', Q: 1 });
    }
  }

  private spawnVisual() {
    if (!this.container) return;
    const count = 5; // More sparks for visibility
    const color = this.colors[this.currentVariation % this.colors.length];
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;

    for (let i = 0; i < count; i++) {
        const graphics = new PIXI.Graphics();
        if (this.currentVariation === 2) {
           graphics.rect(-1.5, -1.5, 3, 3).fill(color); // Larger pixels
        } else {
           graphics.poly([0, -4, 4, 0, 0, 4, -4, 0]).fill(color); // Larger diamonds
        }
        graphics.position.set(centerX, centerY);
        this.container.addChild(graphics);

        this.visuals.push({
          graphics,
          life: 1.0,
          vx: (Math.random() - 0.5) * 35, // Significantly higher velocity
          vy: (Math.random() - 0.5) * 35
        });
    }
  }
}
