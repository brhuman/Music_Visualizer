import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface SnareVisual {
  graphics: PIXI.Graphics;
  life: number;
  maxLife: number;
}

export class SceneSnare extends BaseScene {
  private synth!: Tone.NoiseSynth;
  private filter!: Tone.Filter;
  private seq!: Tone.Sequence;
  private visuals: SnareVisual[] = [];

  private noiseType: Tone.NoiseType = 'white';
  private intensity: number = 1.0;
  private currentVariation: number = 0;
  private colors = [0xff00ff, 0x00ffff, 0xffffff, 0xff0000];

  constructor() {
    super('scene-snare', 'Snare');
  }

  protected onInit(): void {
    this.filter = this.registerNode(new Tone.Filter(2000, 'bandpass').connect(this.audioChannel));
    
    this.synth = this.registerNode(
      new Tone.NoiseSynth({
        noise: { type: this.noiseType },
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
    const dt = (1000 / 60) * deltaTime;
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      v.life -= dt;
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        const progress = 1 - (v.life / v.maxLife); // 0 to 1
        // Expand ring
        v.graphics.scale.set(1 + progress * 2);
        v.graphics.alpha = 1 - progress;
      }
    }
  }

  public setParameters(params: any): void {
    if (params.intensity !== undefined) {
      this.intensity = params.intensity; // 0.1 to 2.0
    }
    if (params.noiseType !== undefined) {
      this.noiseType = params.noiseType;
      this.synth.set({ noise: { type: this.noiseType }});
    }
    if (params.variation !== undefined) {
      this.currentVariation = params.variation;
      const presets: Tone.NoiseType[] = ['white', 'pink', 'brown', 'white'];
      this.synth.noise.type = presets[this.currentVariation % presets.length];
      if (this.currentVariation === 3) this.filter.type = 'highpass';
      else this.filter.type = 'bandpass';
      
      // Industrial tweak
      this.filter.set({ Q: this.currentVariation === 2 ? 10 : 2 });
    }
  }

  public onPointerDown(_e: PIXI.FederatedPointerEvent): void {}

  private spawnVisual() {
    const graphics = new PIXI.Graphics();
    const color = this.colors[this.currentVariation % this.colors.length];
    
    if (this.currentVariation === 1) { // Clap-like rings
       for(let i=0; i<3; i++) {
         graphics.circle(0, 0, 20 + i*15).stroke({ color, width: 2, alpha: 1 - i*0.3 });
       }
    } else if (this.currentVariation === 2) { // Rim-like diamond
       graphics.poly([0, -30, 30, 0, 0, 30, -30, 0]).fill({ color, alpha: 0.5 });
    } else {
       graphics.circle(0, 0, 40).stroke({ color, width: 3 });
    }
    
    // Position at top-center offset
    const x = this.canvasRect.width / 2;
    const y = this.canvasRect.height * 0.25;
    graphics.position.set(x, y);
    
    this.container.addChild(graphics);

    this.visuals.push({
      graphics,
      life: 400,
      maxLife: 400
    });
  }
}
