import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import { BaseScene } from '../core/BaseScene';

interface KickVisual {
  graphics: PIXI.Graphics;
  life: number;
  type: 'pulse' | 'shedtle';
  vx?: number;
  vy?: number;
}

export class SceneKick extends BaseScene {
  private synth!: Tone.MembraneSynth;
  private player!: Tone.Player;
  private dist!: Tone.Distortion;
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
    this.dist = this.registerNode(new Tone.Distortion(0.1).connect(this.audioChannel));
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
            this.synth.triggerAttackRelease(targetFreq, '8n', time, 1.0);
          }
          
          Tone.Draw.schedule(() => {
            this.spawnVisual();
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

    for (let i = this.visuals.length - 1; i >= 0; i--) {
      const v = this.visuals[i];
      
      if (v.type === 'pulse') {
        v.life -= deltaTime * 0.04;
        if (v.life <= 0) {
          v.graphics.destroy();
          this.visuals.splice(i, 1);
        } else {
          // Pulse at perimeter
          const scale = (1.1 - v.life) * 4.5; 
          v.graphics.scale.set(Math.min(scale, 3.0));
          v.graphics.alpha = v.life * 0.7;
        }
      } else if (v.type === 'shedtle') {
        v.life -= deltaTime * 0.02;
        if (v.life <= 0) {
          v.graphics.destroy();
          this.visuals.splice(i, 1);
        } else {
          v.graphics.x += (v.vx || 0) * deltaTime;
          v.graphics.y += (v.vy || 0) * deltaTime;
          
          // Fade as it approaches center
          const dx = centerX - v.graphics.x;
          const dy = centerY - v.graphics.y;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
          
          // Gradually become transparent towards the center
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

  private drawHeart(g: PIXI.Graphics, size: number, color: number) {
    g.beginPath();
    g.moveTo(0, size * 0.3);
    g.bezierCurveTo(0, size * 0.25, -size * 0.4, 0, -size * 0.5, 0);
    g.bezierCurveTo(-size * 1.1, 0, -size * 1.1, size * 0.82, -size * 1.1, size * 0.82);
    g.bezierCurveTo(-size * 1.1, size * 1.2, -size * 0.5, size * 1.8, 0, size * 2.2);
    g.bezierCurveTo(size * 0.5, size * 1.8, size * 1.1, size * 1.2, size * 1.1, size * 0.82);
    g.bezierCurveTo(size * 1.1, size * 0.82, size * 1.1, 0, size * 0.5, 0);
    g.bezierCurveTo(size * 0.4, 0, 0, size * 0.25, 0, size * 0.3);
    g.stroke({ width: 3, color });
  }

  private spawnVisual() {
    if (!this.container) return;
    
    const graphics = new PIXI.Graphics();
    const color = this.colors[this.currentVariation % this.colors.length];
    
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;
    
    // Choose a random edge
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const padding = 20;
    if (edge === 0) { x = Math.random() * w; y = padding; } // Top
    else if (edge === 1) { x = w - padding; y = Math.random() * h; } // Right
    else if (edge === 2) { x = Math.random() * w; y = h - padding; } // Bottom
    else { x = padding; y = Math.random() * h; } // Left

    // Draw Heart or Circle
    if (this.currentVariation === 0 || this.currentVariation === 1) {
       this.drawHeart(graphics, 20, color);
    } else {
       graphics.circle(0, 0, 30).stroke({ width: 3, color });
    }
    
    graphics.x = x;
    graphics.y = y;
    
    this.container.addChild(graphics);
    this.visuals.push({
      graphics,
      life: 1.0,
      type: 'pulse'
    });
  }

  private spawnShedtle() {
    if (!this.container) return;
    
    const count = 3;
    const color = this.colors[this.currentVariation % this.colors.length];
    const centerX = this.canvasRect.width / 2;
    const centerY = this.canvasRect.height / 2;
    const w = this.canvasRect.width;
    const h = this.canvasRect.height;

    for (let i = 0; i < count; i++) {
      const graphics = new PIXI.Graphics();
      
      // Spawn at corners or edges
      let sx, sy;
      const mode = Math.floor(Math.random() * 4);
      if (mode === 0) { sx = 0; sy = 0; } // Top-left
      else if (mode === 1) { sx = w; sy = 0; } // Top-right
      else if (mode === 2) { sx = 0; sy = h; } // Bottom-left
      else { sx = w; sy = h; } // Bottom-right
      
      // Shuttle shape (diamond-ish)
      graphics.poly([0, -8, 4, 0, 0, 8, -4, 0]).fill({ color, alpha: 0.6 });
      
      graphics.x = sx;
      graphics.y = sy;
      
      this.container.addChild(graphics);
      
      const dx = centerX - sx;
      const dy = centerY - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 3 + Math.random() * 3;
      
      this.visuals.push({
        graphics,
        life: 1.0,
        type: 'shedtle',
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed
      });
    }
  }
}
