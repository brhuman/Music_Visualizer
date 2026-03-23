import React from 'react';
import './HelperModal.css';

interface HelperModalProps {
  onClose: (dontShowAgain: boolean) => void;
}

const HelperModal: React.FC<HelperModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const hotkeys = [
    { key: 'Q-Y', label: 'Select Scene' },
    { key: '↑/↓', label: 'Navigate List' },
    { key: '←/→', label: 'Change Variation' },
    { key: 'Space', label: 'Toggle Scene' },
  ];

  return (
    <div className="helper-modal-overlay">
      <div className="helper-modal-content">
        <h2>Hotkeys Guide</h2>
        <div className="hotkey-list">
          {hotkeys.map((hk) => (
            <div key={hk.key} className="hotkey-item">
              <span className="hotkey-label">{hk.label}</span>
              <span className="hotkey-key">{hk.key}</span>
            </div>
          ))}
        </div>
        <div className="helper-modal-footer">
          <label className="dont-show-again">
            <input 
              type="checkbox" 
              checked={dontShowAgain} 
              onChange={(e) => setDontShowAgain(e.target.checked)} 
            />
            Don't show this again
          </label>
          <button className="close-button" onClick={() => onClose(dontShowAgain)}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelperModal;
