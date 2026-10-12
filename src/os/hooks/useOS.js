import { useContext } from 'react';
import { OSContext } from '../contexts/OSContext.jsx';

/**
 * Access the core Elyx OS session context and system controls.
 * 
 * @returns {NonNullable<React.ContextType<typeof OSContext>>}
 */
export const useOS = () => {
  const context = useContext(OSContext);
  if (!context) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
};
