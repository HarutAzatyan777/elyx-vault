import { useContext } from 'react';
import { WindowManagerContext } from '../contexts/WindowManagerContext.jsx';

/**
 * Access the Elyx OS Window Manager controls and state.
 * 
 * @returns {NonNullable<React.ContextType<typeof WindowManagerContext>>}
 */
export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider');
  }
  return context;
};
