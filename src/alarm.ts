import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: AudioPlayer | null = null;
let buzz: ReturnType<typeof setInterval> | null = null;

export async function startAlarm() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    if (!player) {
      player = createAudioPlayer(require('../assets/alarm.wav'));
      player.loop = true;
    }
    player.seekTo(0);
    player.play();
  } catch {}
  if (buzz) clearInterval(buzz);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  buzz = setInterval(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, 1000);
}

export function stopAlarm() {
  if (buzz) {
    clearInterval(buzz);
    buzz = null;
  }
  try {
    if (player) {
      player.pause();
      player.seekTo(0);
    }
  } catch {}
}
