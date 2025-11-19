
self.addEventListener('push', function(event) {
  let data = { title: 'FiberNet', body: 'Nova atualização disponível!', url: '/' };
  
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/93/93634.png', // Generic placeholder icon
    badge: 'https://cdn-icons-png.flaticon.com/512/93/93634.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2',
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
