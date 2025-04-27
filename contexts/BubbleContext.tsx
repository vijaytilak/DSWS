import React, { createContext, useContext, useState } from 'react';

type BubbleContextType = {
  focusBubbleId: number | null;
  setFocusBubbleId: (id: number | null) => void;
};

const BubbleContext = createContext<BubbleContextType | undefined>(undefined);

export function useBubbleContext() {
  const context = useContext(BubbleContext);
  if (context === undefined) {
    throw new Error('useBubbleContext must be used within a BubbleProvider');
  }
  return context;
}

export function BubbleProvider({ children }: { children: React.ReactNode }) {
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null);

  const value = {
    focusBubbleId,
    setFocusBubbleId,
  };

  return (
    <BubbleContext.Provider value={value}>
      {children}
    </BubbleContext.Provider>
  );
}
