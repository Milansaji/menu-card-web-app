/**
 * Professional synthesized sound engine using Web Audio API
 * No external URLs required.
 */
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.current.resume();
  }
  return audioCtx;
};

export const playSound = (type = 'bell') => {
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'bell') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.5);
      osc2.stop(now + 1.5);
    } 
    
    else if (type === 'siren') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(440, now + 1.0);
      osc.frequency.exponentialRampToValueAtTime(880, now + 1.5);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 2.0);
    }

    else if (type === 'digital') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.1);
      osc.frequency.setValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    else if (type === 'chime') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 2.5);
      osc2.stop(now + 2.5);
    }
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
};
