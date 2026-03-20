import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface KickVisual {
  graphics: PIXI.Graphics;
  life: number;
}

export class SceneKick extends BaseScene {
  private synth!: Tone.MembraneSynth;
  private dist!: Tone.Distortion;
  private seq!: Tone.Sequence;
  private visuals: KickVisual[] = [];

  // Settings
  private decayMultiplier: number = 1.0;
  private pitchOffset: number = 0;
  private currentVariation: number = 0;
  private colors = [0x00ffff, 0xff00ff, 0x00ff00, 0xffff00];
  
  constructor() {
    super('scene-kick', 'Kick Drum');
  }

  protected onInit(): void {
    this.dist = this.registerNode(new Tone.Distortion(0.1).connect(this.audioChannel));
    this.synth = this.registerNode(
      new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1.0 }
      }).connect(this.dist)
    );
    this.seq = this.registerNode(
      new Tone.Sequence((time, hit) => {
        if (hit) {
          const targetFreq = Tone.Frequency('C1').toFrequency() + this.pitchOffset * 5;
          this.synth.set({
            envelope: { decay: 0.4 * this.decayMultiplier }
          });
          this.synth.triggerAttackRelease(targetFreq, '8n', time, 1.0);
          
          Tone.Draw.schedule(() => {
            this.spawnVisual();
          }, time);
        }
      }, [1, 1, 1, 1], "4n") // Four on the floor
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
      v.life -= deltaTime * 0.03;
      
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        const scale = (1.1 - v.life) * 15;
        v.graphics.scale.set(scale);
        v.graphics.alpha = v.life;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.decay !== undefined) {
      this.decayMultiplier = params.decay;
    }
    if (params.pitch !== undefined) {
      this.pitchOffset = params.pitch;
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const v = this.currentVariation;
      
      // Professional Sound Design Presets
      switch (v) {
        case 0: // Sub-Heavy
          this.synth.set({ oscillator: { type: 'sine' }, pitchDecay: 0.05, octaves: 4 });
          this.dist.distortion = 0.05;
          break;
        case 1: // Hard Square
          this.synth.set({ oscillator: { type: 'square' }, pitchDecay: 0.08, octaves: 6 });
          this.dist.distortion = 0.4;
          break;
        case 2: // Glitch Hook (New)
          this.synth.set({ oscillator: { type: 'sine' }, pitchDecay: 0.01, octaves: 12 });
          this.dist.distortion = 0.3;
          break;
        case 3: // Industrial Slam (New)
          this.synth.set({ oscillator: { type: 'triangle' }, pitchDecay: 0.15, octaves: 3 });
          this.dist.distortion = 0.8;
          break;
      }
    }
  }

  public onPointerDown(_e: PIXI.FederatedPointerEvent): void {
  }

  private spawnVisual() {
    if (!this.container) return;
    
    const graphics = new PIXI.Graphics();
    const color = this.colors[this.currentVariation % this.colors.length];
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;

    // Geometric Pulse
    if (this.currentVariation === 1 || this.currentVariation === 3) {
       graphics.rect(-40, -40, 80, 80).stroke({ width: 8, color });
    } else {
       graphics.circle(0, 0, 50).stroke({ width: 6, color });
    }
    
    graphics.x = centerX;
    graphics.y = centerY;
    
    this.container.addChild(graphics);
    this.visuals.push({
      graphics,
      life: 1.0
    });
  }
}
