import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface BassBar {
  yOffset: number;
  alpha: number;
}

export class SceneBass extends BaseScene {
  private synth!: Tone.MonoSynth;
  private dist!: Tone.Distortion;
  private filter!: Tone.Filter;
  private chorus!: Tone.Chorus;
  private seq!: Tone.Sequence;
  private graphics!: PIXI.Graphics;
  
  private activeBars: BassBar[] = [];
  private currentVariation: number = 0;
  private colors = [0xBD00FF, 0x00FF9F, 0x00D4FF, 0xFF0055]; // Flat Neon 2026

  constructor() {
    super('scene-bass', 'Techno Bass');
  }

  protected onInit(): void {
    this.dist = this.registerNode(new Tone.Distortion(0.3).connect(this.audioChannel));
    this.chorus = this.registerNode(new Tone.Chorus(4, 2.5, 0.5).connect(this.dist).start());
    this.filter = this.registerNode(new Tone.Filter(150, 'lowpass').connect(this.chorus));
    
    this.synth = this.registerNode(
      new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.5 },
        filterEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.1, baseFrequency: 100, octaves: 2 }
      }).connect(this.filter)
    );

    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);

    // Syncopated 16th rumble pattern
    const pattern = ["C1", null, "C1", "C1", null, "C1", "C1", null];
    this.seq = this.registerNode(
      new Tone.Sequence((time, note) => {
        if (note) {
          this.synth.triggerAttackRelease(note, "16n", time);
          Tone.Draw.schedule(() => {
            this.activeBars.push({ yOffset: 0, alpha: 1.0 });
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
    const centerX = w / 2;
    const centerY = h / 2;

    this.graphics.clear();
    
    for (let i = this.activeBars.length - 1; i >= 0; i--) {
      const bar = this.activeBars[i];
      bar.yOffset += deltaTime * 3.5; // Softer scroll
      bar.alpha -= deltaTime * 0.025;

      if (bar.alpha <= 0 || bar.yOffset > centerY * 1.05) { // Full screen coverage
        this.activeBars.splice(i, 1);
        continue;
      }

      const color = this.colors[this.currentVariation % this.colors.length];
      const intensity = bar.alpha * 0.5; // Softer alpha
      
      for (const side of [-1, 1]) {
        const y = centerY + (bar.yOffset * side);
        const curve = (1 - bar.alpha) * 60; // Less bowing
        
        this.graphics.moveTo(0, y);
        this.graphics.bezierCurveTo(
          centerX, y + (curve * side), 
          centerX, y + (curve * side), 
          w, y
        );
        this.graphics.stroke({ width: 5.0, color, alpha: intensity });
      }
    }
  }

  public setParameters(params: any): void {
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      
      switch (v) {
        case 0: // Deep Sub
          this.synth.set({ oscillator: { type: 'square' } });
          this.filter.set({ frequency: 150, Q: 1, type: 'lowpass' });
          this.chorus.set({ wet: 0, depth: 0 });
          break;
        case 1: // Sawtooth Pulse
          this.synth.set({ oscillator: { type: 'sawtooth' } });
          this.filter.set({ frequency: 300, Q: 1, type: 'lowpass' });
          this.chorus.set({ wet: 0.2, depth: 0.5 });
          break;
        case 2: // Acid Rumble
          this.synth.set({ oscillator: { type: 'sawtooth' } });
          this.filter.set({ frequency: 200, Q: 8, type: 'lowpass' });
          this.chorus.set({ wet: 0.1, depth: 0.2 });
          break;
        case 3: // Cavernous Width
          this.synth.set({ oscillator: { type: 'triangle' } });
          this.filter.set({ frequency: 100, Q: 1, type: 'lowpass' });
          this.chorus.set({ wet: 0.8, depth: 0.9 });
          break;
      }
    }
    if (params.drive !== undefined) {
        this.dist.distortion = params.drive;
    }
  }
}
