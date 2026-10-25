self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(self.registration.showNotification(data.title || "Khoảng Ngẫm", {
    body: data.body || "Một lá thư đang chờ bạn. Chạm thẻ để dành ít phút cho mình nhé.",
    tag: "khoang-ngam-daily-letter",
    renotify: false,
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      return existing.navigate(target);
    }
    return clients.openWindow(target);
  })());
});
