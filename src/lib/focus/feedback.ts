let audio: AudioContext | null = null;

// Browsers only let audio start after a user gesture, so this runs on the
// first pointer press of the page and the later chime is allowed to play.
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No Web Audio: the vibration and the screen change still happen.
  }
}

function beep(context: AudioContext, startAt: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.3);
}

// A short double chime and a vibration, only while the app is open.
export function notifyPhaseEnd() {
  if (audio && audio.state === "running") {
    beep(audio, audio.currentTime);
    beep(audio, audio.currentTime + 0.35);
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}
