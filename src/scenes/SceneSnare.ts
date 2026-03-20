import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface SnareVisual {
  graphics: PIXI.Graphics;
  life: number;
}

export class SceneSnare extends BaseScene {
  private synth!: Tone.NoiseSynth;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: SnareVisual[] = [];

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
    this.visuals.forEach(v => v.graphics.destroy());
    this.visuals = [];
  }

  public update(deltaTime: number): void {
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      v.life -= deltaTime * 0.06;
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        const progress = 1 - v.life;
        // "Sigil Clamp": Limit frame expansion
        v.graphics.scale.set(1 + progress * 2.5);
        v.graphics.rotation += deltaTime * 0.08;
        v.graphics.alpha = v.life * 0.5; // Softer max alpha
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
    const graphics = new PIXI.Graphics();
    const color = this.colors[this.currentVariation % this.colors.length];
    
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;

    // "Geometric Frames" (Thinner lines)
    if (this.currentVariation === 2) {
       graphics.poly([0, -20, 20, 0, 0, 20, -20, 0]).stroke({ color, width: 1.5 });
    } else {
       graphics.rect(-15, -15, 30, 30).stroke({ color, width: 1.5 });
    }
    
    graphics.position.set(centerX, centerY);
    
    this.container.addChild(graphics);
    this.visuals.push({
      graphics,
      life: 1.0
    });
  }
}
