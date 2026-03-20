import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import type { IScene } from './IScene';

export abstract class BaseScene implements IScene {
  public id: string;
  public name: string;
  
  protected container!: PIXI.Container;
  protected canvasRect!: DOMRect;
  protected masterAudioOut!: Tone.InputNode;
  
  // Audio sub-mixer for this specific scene
  protected audioChannel!: Tone.Channel;
  // Track synths/effects to dispose them later to prevent memory/audio leaks
  protected activeNodes: any[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public init(pixiContainer: PIXI.Container, audioDestination: Tone.InputNode, canvasRect: DOMRect): void {
    this.container = pixiContainer;
    this.masterAudioOut = audioDestination;
    this.canvasRect = canvasRect;

    // Create a dedicated audio channel for this scene
    this.audioChannel = new Tone.Channel({
      volume: 0,
      pan: 0,
    }).connect(this.masterAudioOut);
    
    this.activeNodes.push(this.audioChannel);

    this.onInit();
  }

  public start(): void {
    this.onStart();
  }

  public stop(): void {
    this.onStop();
    
    // Auto-dispose all registered nodes
    this.activeNodes.forEach(node => {
      if (node && typeof node.dispose === 'function') {
        node.dispose();
      } else if (node instanceof PIXI.Ticker) {
        node.destroy();
      }
    });
    this.activeNodes = [];

    // Clear pixi graphics
    this.container.destroy({ children: true });
  }

  public abstract update(deltaTime: number): void;
  public abstract setParameters(params: any): void;

  public onPointerDown(_e: PIXI.FederatedPointerEvent): void {}
  public onPointerMove(_e: PIXI.FederatedPointerEvent): void {}
  public onPointerUp(_e: PIXI.FederatedPointerEvent): void {}

  // Scene-specific hooks
  protected abstract onInit(): void;
  protected abstract onStart(): void;
  protected abstract onStop(): void;

  // Helper to register Tone/PIXI nodes for auto-cleanup
  protected registerNode<T>(node: T): T {
    this.activeNodes.push(node);
    return node;
  }
}
