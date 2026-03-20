import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { animationManager } from './core/AnimationManager';
import { SceneKick } from './scenes/SceneKick';
import { SceneSnare } from './scenes/SceneSnare';
import { SceneHats } from './scenes/SceneHats';
import { SceneStab } from './scenes/SceneStab';
import { SceneBass } from './scenes/SceneBass';
import { SceneBackground } from './scenes/SceneBackground';

// Register available scenes on startup
animationManager.registerScene(new SceneKick());
animationManager.registerScene(new SceneSnare());
animationManager.registerScene(new SceneHats());
animationManager.registerScene(new SceneStab());
animationManager.registerScene(new SceneBass());
animationManager.registerScene(new SceneBackground());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
