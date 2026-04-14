import React, { createContext, useState } from 'react';

export const RefreshContext = createContext({ 
  refreshSignal: 0, 
  triggerRefresh: () => {} 
});

export const RefreshProvider = ({ children }: { children: React.ReactNode }) => {
  const [signal, setSignal] = useState(0);
  return (
    <RefreshContext.Provider value={{ 
      refreshSignal: signal, 
      triggerRefresh: () => setSignal(prev => prev + 1) 
    }}>
      {children}
    </RefreshContext.Provider>
  );
};