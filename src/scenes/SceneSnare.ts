import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface SnareSpark {
  graphics: PIXI.Graphics;
  life: number;
  vx: number;
  vy: number;
}

export class SceneSnare extends BaseScene {
  private synth!: Tone.NoiseSynth;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private sparks: SnareSpark[] = [];

  private intensity: number = 1.0;
  private currentVariation: number = 0;
  private colors = [0xFF0055, 0x00FF9F, 0xBD00FF, 0xFF9900]; // Flat Neon 2026

  constructor() {
    super('scene-snare', 'Snare');
  }

  protected onInit(): void {
    this.filter = this.registerNode(new Tone.Filter(2000, 'bandpass').connect(this.audioChannel));
    
    this.synth = this.registerNode(
      new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).connect(this.filter)
    );
    this.seq = this.registerNode(
      new Tone.Sequence((time, hit) => {
        if (hit) {
          this.synth.set({
            envelope: { decay: 0.05 + 0.4 * this.intensity }
          });
          this.synth.triggerAttackRelease('16n', time);
          Tone.Draw.schedule(() => {
            this.spawnVisual();
          }, time);
        }
      }, [0, 1, 0, 1], "4n") // Hit on beats 2 and 4
    );
  }

  protected onStart(): void {
    this.seq.start(0);
  }

  protected onStop(): void {
    this.seq.stop();
    this.sparks.forEach(s => s.graphics.destroy());
    this.sparks = [];
  }

  public update(deltaTime: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= deltaTime * 0.02; // Much slower decay
      
      if (s.life <= 0) {
        s.graphics.destroy();
        this.sparks.splice(i, 1);
      } else {
        s.graphics.x += s.vx * deltaTime;
        s.graphics.y += s.vy * deltaTime;
        s.vx *= 0.98; // Friction
        s.vy *= 0.98;
        
        // Spin and fade
        s.graphics.rotation += deltaTime * 0.1;
        s.graphics.alpha = Math.pow(s.life, 1.2);
        s.graphics.scale.set(s.life * 1.5);
      }
    }
  }

  public setParameters(params: any): void {
    if (params.intensity !== undefined) {
      this.intensity = params.intensity;
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      
      // Robust State Reset
      const presets: Tone.NoiseType[] = ['white', 'pink', 'brown', 'white'];
      this.synth.noise.set({ type: presets[v % presets.length] });
      
      switch (v) {
        case 3:
          this.filter.set({ type: 'highpass', frequency: 3000, Q: 2 });
          break;
        case 2:
          this.filter.set({ type: 'bandpass', frequency: 2000, Q: 10 });
          break;
        default:
          this.filter.set({ type: 'bandpass', frequency: 2000, Q: 2 });
          break;
      }
    }
  }

  private spawnVisual() {
    if (!this.container) return;
    const color = this.colors[this.currentVariation % this.colors.length];
    
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;

    // 4 centers of 4 quadrants
    const centers = [
      { x: w * 0.25, y: h * 0.25 },
      { x: w * 0.75, y: h * 0.25 },
      { x: w * 0.25, y: h * 0.75 },
      { x: w * 0.75, y: h * 0.75 }
    ];

    centers.forEach(center => {
      const sparkCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < sparkCount; i++) {
        const graphics = new PIXI.Graphics();
        graphics.poly([0, -3, 3, 0, 0, 3, -3, 0]).fill({ color, alpha: 0.8 });
        graphics.x = center.x;
        graphics.y = center.y;
        this.container?.addChild(graphics);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        
        this.sparks.push({
          graphics,
          life: 1.0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    });
  }
}
