import { createContext, useContext, useState } from 'react';

const CompareContext = createContext(null);

const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  function togglePhoto(photo) {
    setSelectedPhotos((prev) => {
      const exists = prev.find((p) => p.photo === photo.photo);
      if (exists) {
        return prev.filter((p) => p.photo !== photo.photo);
      }
      if (prev.length >= MAX_COMPARE) {
        return prev; // Do not add more than MAX_COMPARE
      }
      return [...prev, photo];
    });
  }

  function clearSelection() {
    setSelectedPhotos([]);
  }

  return (
    <CompareContext.Provider value={{ selectedPhotos, togglePhoto, clearSelection }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return ctx;
}
