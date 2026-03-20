import * as PIXI from 'pixi.js';
import * as Tone from 'tone';
import type { IScene } from './IScene';

export class AnimationManager {
  private app: PIXI.Application | null = null;
  private scenes: Map<string, IScene> = new Map();
  private activeScenes: Set<string> = new Set();
  private isAudioInitialized = false;
  private initPromise: Promise<void> | null = null;
  private isDestroyed = false;
  private containerElement: HTMLElement | null = null;

  constructor() {
    // defer creation to init
  }

  public async init(canvasContainer: HTMLElement) {
    this.isDestroyed = false;
    this.containerElement = canvasContainer;

    if (this.initPromise) {
      await this.initPromise;
      if (!this.isDestroyed && this.app && this.app.canvas) {
        if (this.app.canvas.parentElement !== canvasContainer) {
          canvasContainer.appendChild(this.app.canvas);
          (this.app as any).resizeTo = canvasContainer;
        }
      }
      return;
    }

    this.initPromise = this._init(canvasContainer);
    await this.initPromise;
  }

  private async _init(canvasContainer: HTMLElement) {
    this.app = new PIXI.Application();

    // Initialize PIXI
    await this.app.init({
      resizeTo: canvasContainer,
      backgroundAlpha: 0, // Transparent background
      antialias: true,
    });

    // Setup global interaction events on the stage
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
    this.app.stage.on('pointerdown', (e) => this.dispatchPointerEvent('onPointerDown', e));
    this.app.stage.on('pointermove', (e) => this.dispatchPointerEvent('onPointerMove', e));
    this.app.stage.on('pointerup', (e) => this.dispatchPointerEvent('onPointerUp', e));
    this.app.stage.on('pointerupoutside', (e) => this.dispatchPointerEvent('onPointerUp', e));

    if (this.isDestroyed) {
      // Cleanly destroy if unmounted while initializing
      this.app.destroy(true);
      this.app = null;
      this.initPromise = null;
      return;
    }

    // Append the newly created canvas to the container
    if (this.containerElement) {
      this.containerElement.appendChild(this.app.canvas);
    }

    // Setup Pixi update loop
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime; // PIXI frame delta
      this.activeScenes.forEach((sceneId) => {
        const scene = this.scenes.get(sceneId);
        if (scene) {
          scene.update(delta);
        }
      });
    });
  }

  public async initAudio() {
    if (!this.isAudioInitialized) {
      await Tone.start();
      console.log('Tone.js audio context started');
      this.isAudioInitialized = true;
    }
  }

  private dispatchPointerEvent(methodName: 'onPointerDown' | 'onPointerMove' | 'onPointerUp', e: PIXI.FederatedPointerEvent) {
    this.activeScenes.forEach(sceneId => {
      const scene = this.scenes.get(sceneId);
      if (scene && typeof (scene as any)[methodName] === 'function') {
        (scene as any)[methodName](e);
      }
    });
  }

  public registerScene(scene: IScene) {
    this.scenes.set(scene.id, scene);
  }

  public startScene(sceneId: string) {
    const scene = this.scenes.get(sceneId);
    if (!scene || this.activeScenes.has(sceneId) || !this.app) return;

    // Each scene gets its own container to isolate graphics
    const container = new PIXI.Container();
    this.app.stage.addChild(container);

    const rect = this.app.canvas.getBoundingClientRect();

    // Call init and start on the scene module
    scene.init(container, Tone.getDestination(), rect);
    scene.start();
    
    this.activeScenes.add(sceneId);
  }

  public stopScene(sceneId: string) {
    const scene = this.scenes.get(sceneId);
    if (!scene || !this.activeScenes.has(sceneId)) return;

    scene.stop();
    this.activeScenes.delete(sceneId);
  }

  public destroy() {
    this.isDestroyed = true;
    this.containerElement = null;
    this.activeScenes.forEach(id => this.stopScene(id));
    
    if (this.initPromise) {
      // Let _init handle the app destruction when it finishes
      return;
    }

    if (this.app) {
      try {
        this.app.destroy(true);
      } catch (e) {
        console.warn('Error destroying PIXI app:', e);
      }
      this.app = null;
    }
  }

  public getApp() {
    return this.app;
  }

  public getScene(sceneId: string): IScene | undefined {
    return this.scenes.get(sceneId);
  }
}

// Export a singleton instance
export const animationManager = new AnimationManager();
