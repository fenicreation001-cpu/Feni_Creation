import React, { createContext, useContext, useState } from 'react';

interface NotificationContextType {
  showNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {},
  showSuccess: () => {},
  showError: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess: showNotification,
        showError: showNotification,
      }}
    >
      {children}
      {notification && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#333', color: '#fff', padding: '10px 18px', borderRadius: '8px', zIndex: 9999 }}>
          {notification}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
