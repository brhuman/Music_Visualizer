import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import './index.css';
import { animationManager } from './core/AnimationManager';

const UI_CONFIG = [
  {
    category: "Techno Ensemble",
    items: [
      { id: 'scene-kick', label: 'Kick Drum (Heart)', params: [
        { id: 'decay', name: 'Decay', min: 0.2, max: 2.0, step: 0.1, value: 1.0 },
        { id: 'pitch', name: 'Pitch Offset', min: -12, max: 12, step: 1, value: 0 }
      ]},
      { id: 'scene-bass', label: 'Rumble Bass', params: [
        { id: 'drive', name: 'Drive/Type', min: 0, max: 1, step: 0.1, value: 0 }
      ]},
      { id: 'scene-stab', label: 'Warehouse Stab', params: [] },
      { id: 'scene-snare', label: 'Industrial Percussion', params: [
        { id: 'intensity', name: 'Intensity', min: 0.1, max: 2.0, step: 0.1, value: 1.0 }
      ]},
      { id: 'scene-hats', label: 'Hi-Hats', params: [
        { id: 'speed', name: 'Variation', min: 0.5, max: 3.0, step: 0.1, value: 1.0 },
        { id: 'pitch', name: 'Frequency', min: 100, max: 500, step: 10, value: 200 }
      ]}
    ]
  }
];

function App() {
  const [activeScenes, setActiveScenes] = useState<Set<string>>(new Set());
  const [sceneVariations, setSceneVariations] = useState<Record<string, number>>({});
  const [selectedSceneId, setSelectedSceneId] = useState<string>(UI_CONFIG[0].items[0].id);
  const [audioStarted, setAudioStarted] = useState(false);
  const [volume, setVolume] = useState(-10);
  const [bpm, setBpm] = useState(130);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Store params state per scene
  const [sceneParams, setSceneParams] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    UI_CONFIG.forEach(cat => cat.items.forEach(item => {
      initial[item.id] = {};
      item.params.forEach(p => {
        initial[item.id][p.id] = p.value;
      });
    }));
    return initial;
  });

  const handleStartAudio = async () => {
    if (audioStarted) return;
    await animationManager.initAudio();
    Tone.Transport.start();
    animationManager.startScene('scene-background');
    setAudioStarted(true);
  };

  const toggleScene = (sceneId: string) => {
    if (!audioStarted) return;
    
    const newScenes = new Set(activeScenes);
    if (newScenes.has(sceneId)) {
      animationManager.stopScene(sceneId);
      newScenes.delete(sceneId);
    } else {
      animationManager.startScene(sceneId);
      newScenes.add(sceneId);
      
      const scene = animationManager.getScene(sceneId);
      if (scene && sceneParams[sceneId]) {
        scene.setParameters(sceneParams[sceneId]);
      }
    }
    setActiveScenes(newScenes);
  };

  const updateParam = (sceneId: string, paramId: string, value: number) => {
    setSceneParams(prev => {
      const next = { ...prev };
      next[sceneId] = { ...next[sceneId], [paramId]: value };
      
      if (activeScenes.has(sceneId)) {
        const scene = animationManager.getScene(sceneId);
        if (scene) {
          scene.setParameters({ [paramId]: value });
        }
      }
      return next;
    });
  };

  const changeVariation = (id: string, delta: number) => {
    const current = sceneVariations[id] || 0;
    const next = (current + delta + 4) % 4;
    setSceneVariations(prev => ({ ...prev, [id]: next }));
    
    if (activeScenes.has(id)) {
      const scene = animationManager.getScene(id);
      if (scene) {
        scene.setParameters({ variation: next });
      }
    }
  };

  useEffect(() => {
    if (audioStarted) {
      Tone.getDestination().volume.rampTo(volume, 0.1);
      Tone.Transport.bpm.value = bpm;
    }
  }, [volume, bpm, audioStarted]);

  useEffect(() => {
    if (canvasRef.current) {
      animationManager.init(canvasRef.current);
    }
    
    const autoStart = async () => {
      if (!audioStarted) {
        await handleStartAudio();
      }
      window.removeEventListener('click', autoStart);
      window.removeEventListener('keydown', autoStart);
    };
    window.addEventListener('click', autoStart);
    window.addEventListener('keydown', autoStart);

    return () => {
      animationManager.destroy();
      window.removeEventListener('click', autoStart);
      window.removeEventListener('keydown', autoStart);
    };
  }, [audioStarted]);

  useEffect(() => {
    if (!audioStarted) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const technoKeys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'];
      const keyIdx = technoKeys.indexOf(e.code);
      if (keyIdx !== -1) {
        const item = UI_CONFIG[0].items[keyIdx];
        if (item) setSelectedSceneId(item.id);
        return;
      }

      const allItems = UI_CONFIG.flatMap(c => c.items);
      const currentIdx = allItems.findIndex(i => i.id === selectedSceneId);

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        const next = allItems[(currentIdx + 1) % allItems.length];
        setSelectedSceneId(next.id);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const next = allItems[(currentIdx - 1 + allItems.length) % allItems.length];
        setSelectedSceneId(next.id);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        changeVariation(selectedSceneId, 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        changeVariation(selectedSceneId, -1);
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleScene(selectedSceneId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [audioStarted, selectedSceneId, changeVariation, toggleScene]);


  return (
    <div className="app-container">
      <aside className="sidebar" style={{ overflowY: 'auto' }}>
        <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Techno Visualizer</h1>
        <div className="controls">

          {UI_CONFIG.map(cat => (
            <div key={cat.category} style={{ marginBottom: '1rem' }}>
              <h3 style={{ 
                color: '#cbd5e1', 
                borderBottom: '1px solid #334155', 
                paddingBottom: '0.15rem', 
                marginBottom: '0.4rem',
                fontSize: '0.9rem' 
              }}>
                {cat.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cat.items.map(item => {
                    const isActive = activeScenes.has(item.id);
                    const isSelected = selectedSceneId === item.id;
                    return (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.25rem',
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px',
                        padding: '2px',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button 
                            className={`scene-button ${isActive ? 'active' : ''}`}
                            onClick={() => { setSelectedSceneId(item.id); toggleScene(item.id); }}
                            disabled={!audioStarted}
                            style={{ 
                              flexGrow: 1,
                              opacity: audioStarted ? 1 : 0.5,
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.85rem',
                              border: 'none',
                              background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'white',
                              borderRadius: '4px'
                            }}
                          >
                            {item.label}
                          </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); changeVariation(item.id, -1); }}
                            disabled={!audioStarted || !isActive}
                            style={{ 
                              background: 'rgba(255,255,255,0.1)', 
                              border: 'none', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              opacity: (audioStarted && isActive) ? 1 : 0.3
                            }}
                          >
                            &lt;
                          </button>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', minWidth: '1em', textAlign: 'center' }}>
                            {(sceneVariations[item.id] || 0) + 1}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); changeVariation(item.id, 1); }}
                            disabled={!audioStarted || !isActive}
                            style={{ 
                              background: 'rgba(255,255,255,0.1)', 
                              border: 'none', 
                              color: 'white', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              opacity: (audioStarted && isActive) ? 1 : 0.3
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      </div>
                      
                      {/* Sub-settings if active */}
                      {isActive && item.params.length > 0 && (
                        <div style={{ background: '#1e293b', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {item.params.map(p => (
                            <div key={p.id} style={{ marginBottom: '0.5rem' }}>
                              <label style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.25rem' }}>
                                <span>{p.name}</span>
                                <span>{sceneParams[item.id][p.id]}</span>
                              </label>
                              <input 
                                type="range" 
                                min={p.min} max={p.max} step={p.step}
                                value={sceneParams[item.id][p.id]}
                                onChange={(e) => updateParam(item.id, p.id, parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {audioStarted && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Master Volume</span>
                <span>{volume} dB</span>
              </label>
              <input 
                type="range" 
                min="-60" 
                max="0" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer', marginBottom: '1rem' }}
              />
              
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Tempo (BPM)</span>
                <span>{bpm}</span>
              </label>
              <input 
                type="range" 
                min="60" 
                max="200" 
                step="1"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>
      </aside>
      
      <main className="canvas-container">
        <div ref={canvasRef} id="pixi-container" className="canvas-wrapper"></div>
      </main>
    </div>
  );
}

export default App;
