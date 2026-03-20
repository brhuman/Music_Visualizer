import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

export class SceneBass extends BaseScene {
  private synth!: Tone.MonoSynth;
  private dist!: Tone.Distortion;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private graphics!: PIXI.Graphics;
  private activeBars: { y: number, alpha: number }[] = [];

  constructor() {
    super('scene-bass', 'Techno Bass');
  }

  protected onInit(): void {
    this.dist = this.registerNode(new Tone.Distortion(0.8).connect(this.audioChannel));
    this.filter = this.registerNode(new Tone.Filter(100, 'lowpass').connect(this.dist));
    
    this.synth = this.registerNode(
      new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4 },
        filter: { Q: 1, type: 'lowpass', rolloff: -12 },
        filterEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4, baseFrequency: 50, octaves: 1 }
      }).connect(this.filter)
    );

    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);

    // Syncopated 16th rumble pattern
    const pattern = ["C1", 0, "C1", "C1", 0, "C1", "C1", 0];
    this.seq = this.registerNode(
      new Tone.Sequence((time, note) => {
        if (note) {
          this.synth.triggerAttackRelease(note, "16n", time);
          Tone.Draw.schedule(() => {
            this.activeBars.push({ y: 0, alpha: 1.0 });
          }, time);
        }
      }, pattern, "16n")
    );
  }

  protected onStart(): void {
    this.seq.start(0);
  }

  protected onStop(): void {
    this.seq.stop();
    this.graphics.clear();
    this.activeBars = [];
  }

  public update(deltaTime: number): void {
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;
    
    // Variation 3 (Drone) has slower scroll
    const scrollSpeed = (this.currentVariation === 3 ? 1 : 5) * deltaTime;

    this.graphics.clear();
    
    for (let i = this.activeBars.length - 1; i >= 0; i--) {
      const bar = this.activeBars[i];
      bar.y += scrollSpeed;
      bar.alpha -= 0.01 * deltaTime;

      if (bar.y > h || bar.alpha <= 0) {
        this.activeBars.splice(i, 1);
        continue;
      }

      const color = this.colors[this.currentVariation % this.colors.length];
      
      if (this.currentVariation === 2) { // Pulse/Glitch style
         this.graphics.rect(0, bar.y, w, 8).fill({ color, alpha: bar.alpha * 0.4 });
      } else {
         this.graphics.rect(0, bar.y, w, 2).fill({ color, alpha: bar.alpha * 0.6 });
         this.graphics.rect(0, bar.y - 1, w, 4).fill({ color, alpha: bar.alpha * 0.3 });
      }
    }
  }

  private currentVariation: number = 0;
  private colors = [0x4444ff, 0x5cacee, 0x9370db, 0x4169e1];

  public setParameters(params: any): void {
    if (params.drive !== undefined) {
      this.synth.oscillator.type = params.drive > 0.5 ? 'sawtooth' : 'square';
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      const types = ['square', 'sawtooth', 'triangle', 'sine'];
      this.synth.oscillator.type = types[v % types.length] as any;
      
      if (v === 3) { // Drone
         // @ts-ignore
         this.seq.events = ["C1"];
      } else {
         // @ts-ignore
         this.seq.events = ["C1"];
      }
    }
  }
}
