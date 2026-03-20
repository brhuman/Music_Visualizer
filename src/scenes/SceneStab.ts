import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface StabVisual {
  graphics: PIXI.Graphics;
  life: number;
  rotationSpeed: number;
}

export class SceneStab extends BaseScene {
  private polySynth!: Tone.PolySynth;
  private delay!: Tone.FeedbackDelay;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: StabVisual[] = [];

  private currentVariation: number = 0;
  private colors = [0xBD00FF, 0x00D4FF, 0xFF0055, 0x00FF9F]; // Flat Neon 2026

  constructor() {
    super('scene-stab', 'Warehouse Stab');
  }

  protected onInit(): void {
    this.delay = this.registerNode(new Tone.FeedbackDelay("8n", 0.4).connect(this.audioChannel));
    this.filter = this.registerNode(new Tone.Filter(1500, 'bandpass').connect(this.delay));
    
    this.polySynth = this.registerNode(
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.2 }
      }).connect(this.filter)
    );

    // Classic techno stab pattern (syncopated)
    const pattern = ["C3", 0, 0, "C3", 0, "C3", 0, 0];
    this.seq = this.registerNode(
      new Tone.Sequence((time, note) => {
        if (note) {
          const freq = Tone.Frequency(note).toFrequency();
          let notes = [freq, freq * 1.2, freq * 1.5];
          if (this.currentVariation === 3) notes = [freq, freq * 1.2, freq * 1.5, freq * 1.88, freq * 2.25];
          
          this.polySynth.triggerAttackRelease(notes, "16n", time);
          
          Tone.Draw.schedule(() => {
            this.spawnVisual();
          }, time);
        }
      }, pattern, "8n")
    );
  }

  protected onStart(): void {
    this.seq.start(0);
  }

  protected onStop(): void {
    this.seq.stop();
    this.polySynth.releaseAll();
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
        // "Sigil Clamp": Reduced expansion spread
        const scale = 1 + (1 - v.life) * 2;
        v.graphics.scale.set(Math.min(scale, 2.5));
        v.graphics.rotation += v.rotationSpeed * deltaTime;
        v.graphics.alpha = v.life * 0.6;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      
      // Robust State Reset
      switch (v) {
        case 0: // Classic Minor
          this.polySynth.set({ oscillator: { type: 'sawtooth' } });
          this.filter.set({ frequency: 1500, Q: 2, type: 'bandpass' });
          this.delay.set({ feedback: 0.4, delayTime: "8n" });
          break;
        case 1: // Detuned
          this.polySynth.set({ oscillator: { type: 'square' } });
          this.filter.set({ frequency: 1000, Q: 1, type: 'bandpass' });
          this.delay.set({ feedback: 0.3, delayTime: "8n" });
          break;
        case 2: // Metallic Grit
          this.polySynth.set({ oscillator: { type: 'fmsine' } as any });
          this.filter.set({ frequency: 3000, Q: 10, type: 'highpass' });
          this.delay.set({ feedback: 0.2, delayTime: "16n" });
          break;
        case 3: // Dub Chord
          this.polySynth.set({ oscillator: { type: 'triangle' } });
          this.filter.set({ frequency: 800, Q: 1.5, type: 'bandpass' });
          this.delay.set({ feedback: 0.7, delayTime: "4n" });
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

    const numLines = 12 + Math.floor(Math.random() * 8); // Significantly more lines
    for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const length = 50 + Math.random() * 50; // Longer lines
        graphics.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        graphics.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    }
    graphics.stroke({ color, width: 2.5, alpha: 0.9 });
    
    graphics.position.set(centerX, centerY);
    graphics.rotation = Math.random() * Math.PI;
    
    this.container.addChild(graphics);
    this.visuals.push({ 
      graphics, 
      life: 1.0, 
      rotationSpeed: (Math.random() - 0.5) * 0.08 
    });
  }
}
