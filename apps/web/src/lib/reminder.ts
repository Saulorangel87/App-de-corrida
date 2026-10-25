import { fetchApi } from "./api";

// Lembrete do treino por notificação (Web Push): inscrição do aparelho no serviço de push do
// navegador e registro na API com o horário e o fuso da pessoa.

export type PushConfig = { enabled: boolean; publicKey: string | null };
export type ReminderDay = "mesmo_dia" | "vespera";
export type ServerSubscription = { endpoint: string; time: string; day: ReminderDay; timeZone: string };

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Chave pública VAPID (base64url) no formato que o navegador pede. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Inscrição deste aparelho no serviço de push, se houver. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Pede a permissão, inscreve o aparelho e grava o horário e o dia na API. Devolve a permissão final. */
export async function enableReminder(publicKey: string, time: string, day: ReminderDay): Promise<NotificationPermission> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await saveReminder(sub, time, day);
  return permission;
}

export async function saveReminder(sub: PushSubscription, time: string, day: ReminderDay) {
  const json = sub.toJSON();
  await fetchApi("/push/subscription", {
    method: "PUT",
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      time,
      day,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
}

/** Desliga o lembrete deste aparelho (na API e no serviço de push). Usado também ao sair da conta. */
export async function disableReminder() {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetchApi("/push/subscription", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {
    /* sem a API o aparelho ainda sai do serviço de push; o servidor apaga o resto quando o push falhar */
  });
  await sub.unsubscribe().catch(() => undefined);
}
