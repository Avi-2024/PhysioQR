import apiClient from './api-client';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const isWebPushSupported = () => (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window
);

export async function enableWebPush() {
  if (!isWebPushSupported()) throw new Error('Web push is not supported in this browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const [{ data }, registration] = await Promise.all([
    apiClient.get('/notifications/web-push/public-key'),
    navigator.serviceWorker.register('/push-sw.js'),
  ]);

  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  await apiClient.post('/notifications/web-push/subscribe', subscription.toJSON());
  return subscription;
}

export async function disableWebPush() {
  if (!isWebPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await apiClient.delete('/notifications/web-push/unsubscribe', { data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
