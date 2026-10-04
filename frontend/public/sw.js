self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data;

  try {
    data = event.data.json();
  } catch {
    data = {
      title: "PriceWatch",
      body: event.data.text(),
    };
  }

  const title = data.title || "PriceWatch";

  const options = {
    body: data.body || "Your product price has changed.",
    icon: "/pwlogo.PNG",
    badge: "/pwlogo.PNG",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options,
    ),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    // Only navigate this application's own pages.
    let targetUrl = new URL("/", self.location.origin).href;
    try {
      const candidate = new URL(event.notification.data?.url || "/", self.location.origin);
      if (candidate.origin === self.location.origin) targetUrl = candidate.href;
    } catch { /* Invalid payload falls back to the homepage. */ }

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      }).then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
    );
  },
);

