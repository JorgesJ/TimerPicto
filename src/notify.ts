import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Temporizador',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm.wav',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) {
    await Notifications.requestPermissionsAsync();
  }
}

export async function scheduleEnd(seconds: number): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Tiempo!',
        body: 'El temporizador ha terminado',
        sound: 'alarm.wav',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds),
        repeats: false,
        channelId: 'timer',
      },
    });
  } catch {
    return null;
  }
}

export async function cancelEnd(id: string | null) {
  try {
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}
