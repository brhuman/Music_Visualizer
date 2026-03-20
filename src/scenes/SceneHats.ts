import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface HatVisual {
  graphics: PIXI.Graphics;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

export class SceneHats extends BaseScene {
  private synth!: Tone.NoiseSynth;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: HatVisual[] = [];
  
  private speedMultiplier: number = 1.0;

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
          const decay = (0.01 + Math.random() * 0.05) * this.speedMultiplier; // use speedMultiplier for range
          this.synth.envelope.decay = decay;
          this.synth.triggerAttackRelease(decay, time);
          Tone.Draw.schedule(() => {
            this.spawnVisual();
          }, time);
      }, [0, 1], "8n") // [On-beat, Off-beat]
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
    const dt = (1000 / 60) * deltaTime;
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      v.life -= dt;
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        // move and shrink
        v.graphics.x += v.vx * deltaTime * this.speedMultiplier;
        v.graphics.y += v.vy * deltaTime * this.speedMultiplier;
        const progress = Math.max(0, v.life / v.maxLife);
        v.graphics.scale.set(progress);
        v.graphics.alpha = progress;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.speed !== undefined) {
      this.speedMultiplier = params.speed; // 0.5 to 3.0
    }
    if (params.pitch !== undefined) {
      this.filter.frequency.value = params.pitch * 20; // Map range to high freq
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const presets = [
        { decay: 0.04, filter: 8000 }, // Closed
        { decay: 0.25, filter: 3000 }, // Open
        { decay: 0.01, filter: 10000 }, // Sharp/Tick
        { decay: 0.08, filter: 2000 }  // Shaker/Soft
      ];
      const p = presets[this.currentVariation % presets.length];
      this.synth.envelope.decay = p.decay;
      this.filter.frequency.value = p.filter;
    }
  }

  private currentVariation: number = 0;
  private colors = [0xffff00, 0xffffff, 0x00ffff, 0xff00ff];

  public onPointerDown(_e: PIXI.FederatedPointerEvent): void {}
  public onPointerMove(_e: PIXI.FederatedPointerEvent): void {}

  private spawnVisual() {
    // Spawn 2-3 sparks in both top corners
    const count = 2;
    const color = this.colors[this.currentVariation % this.colors.length];
    const corners = [
      { x: this.canvasRect.width * 0.1, y: this.canvasRect.height * 0.1 },
      { x: this.canvasRect.width * 0.9, y: this.canvasRect.height * 0.1 }
    ];

    corners.forEach(pos => {
      for (let i = 0; i < count; i++) {
        const graphics = new PIXI.Graphics();
        if (this.currentVariation === 2) {
           graphics.rect(-3, -3, 6, 6).fill(color); // Dots for tick
        } else {
           graphics.poly([0, -5, 5, 0, 0, 5, -5, 0]).fill(color); // Yellow diamond
        }
        graphics.position.set(pos.x, pos.y);
        this.container.addChild(graphics);

        this.visuals.push({
          graphics,
          life: 300,
          maxLife: 300,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8
        });
      }
    });
  }
}
