import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface StabVisual {
  graphics: PIXI.Graphics;
  life: number;
  maxLife: number;
}

export class SceneStab extends BaseScene {
  private polySynth!: Tone.PolySynth;
  private delay!: Tone.FeedbackDelay;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: StabVisual[] = [];

  private currentVariation: number = 0;
  private colors = [0xcccccc, 0x00ffff, 0xff00ff, 0x999999];

  constructor() {
    super('scene-stab', 'Warehouse Stab');
  }

  protected onInit(): void {
    this.delay = this.registerNode(new Tone.FeedbackDelay("8n", 0.4).connect(this.audioChannel));
    this.filter = this.registerNode(new Tone.Filter(1500, 'bandpass').connect(this.delay));
    
    this.polySynth = this.registerNode(
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
      }).connect(this.filter)
    );

    // Classic techno stab pattern (syncopated)
    const pattern = ["C3", 0, 0, "C3", 0, "C3", 0, 0];
    this.seq = this.registerNode(
      new Tone.Sequence((time, note) => {
        if (note) {
          // Trigger a minor chord
          const freq = Tone.Frequency(note).toFrequency();
          this.polySynth.triggerAttackRelease([freq, freq * 1.2, freq * 1.5], "16n", time);
          
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
    const dt = (1000 / 60) * deltaTime;
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      v.life -= dt;
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        const progress = v.life / v.maxLife;
        v.graphics.scale.set(1 + (1 - progress) * 2);
        v.graphics.alpha = progress;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      const types = ['sawtooth', 'square', 'sine', 'triangle'];
      this.polySynth.set({ oscillator: { type: types[v % types.length] } as any });
      
      // Update filter cutoff based on variation
      this.filter.frequency.value = 1000 + v * 500;
    }
  }

  private spawnVisual() {
    const graphics = new PIXI.Graphics();
    const color = this.colors[this.currentVariation % this.colors.length];
    
    // Draw a "shattering" square visual
    graphics.rect(-40, -40, 80, 80).stroke({ color, width: 2 });
    graphics.rect(-30, -30, 60, 60).stroke({ color, width: 1, alpha: 0.5 });
    
    const x = Math.random() * this.canvasRect.width;
    const y = Math.random() * this.canvasRect.height;
    graphics.position.set(x, y);
    graphics.rotation = Math.random() * Math.PI;
    
    this.container.addChild(graphics);
    this.visuals.push({ graphics, life: 500, maxLife: 500 });
  }
}
