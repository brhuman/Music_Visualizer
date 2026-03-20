import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

export interface IScene {
  id: string;
  name: string;
  init(pixiContainer: PIXI.Container, audioDestination: Tone.InputNode, canvasRect: DOMRect): void;
  start(): void;
  stop(): void;
  update(deltaTime: number): void;
  setParameters(params: any): void;
  onPointerDown?(e: PIXI.FederatedPointerEvent): void;
  onPointerMove?(e: PIXI.FederatedPointerEvent): void;
  onPointerUp?(e: PIXI.FederatedPointerEvent): void;
}
