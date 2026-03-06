import { useRef, useState } from 'react';
import { TanjiroCanvas } from './components/TanjiroCanvas';
import { TanjiroController } from './pixi/TanjiroController';
import './App.css';

function App() {
  const controllerRef = useRef<TanjiroController | null>(null);
  const [talking, setTalking] = useState(false);
  const [thinking, setThinking] = useState(false);

  const toggleTalking = () => {
    const next = !talking;
    setTalking(next);
    if (next) setThinking(false);
    controllerRef.current?.setTalking(next);
  };

  const toggleThinking = () => {
    const next = !thinking;
    setThinking(next);
    if (next) setTalking(false);
    controllerRef.current?.setThinking(next);
  };

  const triggerHappy = () => {
    setTalking(false);
    setThinking(false);
    controllerRef.current?.playHappy();
  };

  return (
    <div className="app-container">
      <TanjiroCanvas onReady={(c) => { controllerRef.current = c; }} />
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12 }}>
        <button
          onClick={toggleTalking}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            cursor: 'pointer',
            borderRadius: 8,
            border: 'none',
            background: talking ? '#e74c3c' : '#2ecc71',
            color: '#fff',
          }}
        >
          {talking ? 'Stop Talking' : 'Start Talking'}
        </button>
        <button
          onClick={toggleThinking}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            cursor: 'pointer',
            borderRadius: 8,
            border: 'none',
            background: thinking ? '#e74c3c' : '#3498db',
            color: '#fff',
          }}
        >
          {thinking ? 'Stop Thinking' : 'Start Thinking'}
        </button>
        <button
          onClick={triggerHappy}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            cursor: 'pointer',
            borderRadius: 8,
            border: 'none',
            background: '#f39c12',
            color: '#fff',
          }}
        >
          Happy!
        </button>
      </div>
    </div>
  );
}

export default App;
