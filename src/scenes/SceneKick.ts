import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface KickVisual {
  graphics: PIXI.Graphics;
  life: number;
  type: 'stripe' | 'shedtle';
  vx: number;
  vy: number;
}

export class SceneKick extends BaseScene {
  private synth!: Tone.MembraneSynth;
  private player!: Tone.Player;
  private dist!: Tone.Distortion;
  private volumeNode!: Tone.Gain;
  private seq!: Tone.Sequence;
  private visuals: KickVisual[] = [];

  // Settings
  private decayMultiplier: number = 1.0;
  private pitchOffset: number = 0;
  private currentVariation: number = 0;
  private colors = [0x00FF9F, 0xFF0055, 0x00D4FF, 0xFF9900]; // Flat Neon 2026
  
  constructor() {
    super('scene-kick', 'Kick Drum');
  }

  protected onInit(): void {
    this.volumeNode = this.registerNode(new Tone.Gain(1.0).connect(this.audioChannel));
    this.dist = this.registerNode(new Tone.Distortion(0.1).connect(this.volumeNode));
    this.synth = this.registerNode(
      new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.6 }
      }).connect(this.dist)
    );

    // Variation 2 Sampled (TR-909)
    this.player = this.registerNode(
      new Tone.Player({
        url: '/assets/audio/kick_2.wav',
        autostart: false
      }).connect(this.dist)
    );

    this.seq = this.registerNode(
      new Tone.Sequence((time, hit) => {
        if (hit) {
          if (this.currentVariation === 1) {
            this.player.start(time);
          } else {
            const targetFreq = Tone.Frequency('C1').toFrequency() + this.pitchOffset * 5;
            this.synth.set({
              envelope: { decay: 0.4 * this.decayMultiplier }
            });
            const velocity = this.currentVariation === 2 ? 1.6 : 1.0;
            this.synth.triggerAttackRelease(targetFreq, '8n', time, velocity);
          }
          
          Tone.Draw.schedule(() => {
            this.spawnStripes();
            this.spawnShedtle();
          }, time);
        }
      }, [1, 1, 1, 1], "4n")
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
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      const isBeta = this.currentVariation === 2;
      
      // All kick visuals now last longer
      const decay = v.type === 'stripe' ? (isBeta ? 0.01 : 0.015) : 0.01;
      v.life -= deltaTime * decay;
      
      if (v.life <= 0) {
        v.graphics.destroy();
        this.visuals.splice(i, 1);
      } else {
        v.graphics.x += v.vx * deltaTime;
        v.graphics.y += v.vy * deltaTime;
        
        const dx = centerX - v.graphics.x;
        const dy = centerY - v.graphics.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        
        if (v.type === 'stripe') {
          if (isBeta) {
            // Beta: Thick -> Thin, Opaque -> Transparent, Reaches center
            v.graphics.alpha = v.life * 0.7;
            
            // Thinning: start at 1.0 scale (thick) and go down
            const scale = Math.max(0.05, v.life);
            if (v.vx === 0) v.graphics.scale.y = scale;
            else v.graphics.scale.x = scale;

            // Kill if very close to center or life ends
            if (distToCenter < 10) v.life = 0;
          } else {
            // Original: Move from edges to center and fade out
            v.graphics.alpha = Math.min(v.life * 0.6, distToCenter / (maxDist * 0.4));
          }
        } else {
           // Shedtle particles
           v.graphics.alpha = Math.min(v.life, distToCenter / (maxDist * 0.5));
           v.graphics.rotation += deltaTime * 0.05;
        }
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
      
      switch (v) {
        case 0: // Sub-Heavy
          this.synth.set({ oscillator: { type: 'sine' }, pitchDecay: 0.05, octaves: 4 });
          this.dist.set({ distortion: 0.05 });
          break;
        case 1: // Sampled 909
          this.dist.set({ distortion: 0.1 });
          break;
        case 2: // Deep Synth 909
          this.synth.set({ oscillator: { type: 'sine' }, pitchDecay: 0.04, octaves: 4 });
          this.dist.set({ distortion: 0.0 }); 
          break;
        case 3: // Industrial Slam
          this.synth.set({ oscillator: { type: 'triangle' }, pitchDecay: 0.15, octaves: 3 });
          this.dist.set({ distortion: 0.8 });
          break;
      }
    }
  }

  private spawnStripes() {
    if (!this.container) return;
    
    const color = this.colors[this.currentVariation % this.colors.length];
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;
    
    // Variation 2 (Deep Synth 909) - "Beta"
    const isBeta = this.currentVariation === 2;
    const thickness = isBeta ? 60 : 15;
    const speed = isBeta ? 6.5 : 4.5;

    // Spawn stripes from all 4 sides moving to center
    const stripes = [
        { x: w / 2, y: -thickness, width: w, height: thickness, vx: 0, vy: speed }, // Top
        { x: w + thickness, y: h / 2, width: thickness, height: h, vx: -speed, vy: 0 }, // Right
        { x: w / 2, y: h + thickness, width: w, height: thickness, vx: 0, vy: -speed }, // Bottom
        { x: -thickness, y: h / 2, width: thickness, height: h, vx: speed, vy: 0 }  // Left
    ];

    stripes.forEach(s => {
        const graphics = new PIXI.Graphics();
        graphics.rect(-s.width / 2, -s.height / 2, s.width, s.height).fill({ color, alpha: isBeta ? 0.7 : 0.3 });
        graphics.x = s.x;
        graphics.y = s.y;
        this.container?.addChild(graphics);
        this.visuals.push({
            graphics,
            life: 1.0,
            type: 'stripe',
            vx: s.vx,
            vy: s.vy
        });
    });
  }

  private spawnShedtle() {
    if (!this.container) return;
    
    const count = 4;
    const color = this.colors[this.currentVariation % this.colors.length];
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;

    for (let i = 0; i < count; i++) {
      const graphics = new PIXI.Graphics();
      
      let sx, sy;
      const mode = Math.floor(Math.random() * 4);
      if (mode === 0) { sx = 0; sy = 0; }
      else if (mode === 1) { sx = w; sy = 0; }
      else if (mode === 2) { sx = 0; sy = h; }
      else { sx = w; sy = h; }
      
      graphics.poly([0, -8, 4, 0, 0, 8, -4, 0]).fill({ color, alpha: 0.5 });
      graphics.x = sx;
      graphics.y = sy;
      this.container.addChild(graphics);
      
      const dx = centerX - sx;
      const dy = centerY - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = 4 + Math.random() * 3;
      
      this.visuals.push({
        graphics,
        life: 1.0,
        type: 'shedtle',
        vx: (dx / dist) * moveSpeed,
        vy: (dy / dist) * moveSpeed
      });
    }
  }
}
