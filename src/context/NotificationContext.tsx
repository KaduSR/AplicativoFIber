import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  sendNotification: (title: string, body: string, url?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker Registered', reg))
        .catch(err => console.error('Service Worker Failed', err));
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const sendNotification = (title: string, body: string, url: string = '/') => {
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/93/93634.png',
          vibrate: [200, 100, 200],
          tag: 'fiber-update',
          data: { url }
        } as any);
      });
    } else if (permission === 'granted') {
       // Fallback for non-SW contexts
       new Notification(title, { body });
    }
  };

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, sendNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};