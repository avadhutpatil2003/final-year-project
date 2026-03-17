import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateCurrentSession } from '../services/sessionManager';

// Hook to validate supervisor sessions and handle automatic logout
export const useSessionValidation = (checkInterval = 30000) => { // Check every 30 seconds
  const [sessionValid, setSessionValid] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const { supervisorData, forceLogout } = useAuth();

  useEffect(() => {
    // Only validate sessions for supervisors
    if (!supervisorData) {
      return;
    }

    const validateSession = async () => {
      try {
        const validation = await validateCurrentSession();
        
        if (!validation.valid) {
          console.log(`🚨 Session validation failed: ${validation.reason}`);
          setSessionValid(false);
          
          // Show user-friendly message based on reason
          let message = 'Your session has expired. Please log in again.';
          if (validation.reason === 'Supervisor account is inactive') {
            message = 'Your account has been deactivated. Please contact your administrator.';
          }
          
          alert(message);
          await forceLogout();
        } else {
          setSessionValid(true);
          setLastCheck(new Date());
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // Don't force logout on validation errors, just log them
      }
    };

    // Initial validation
    validateSession();

    // Set up periodic validation
    const interval = setInterval(validateSession, checkInterval);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [supervisorData, checkInterval, forceLogout]);

  return {
    sessionValid,
    lastCheck
  };
};

// Hook to monitor supervisor status changes in real-time
export const useSupervisorStatusMonitor = () => {
  const { supervisorData } = useAuth();
  const [supervisorStatus, setSupervisorStatus] = useState('active');

  useEffect(() => {
    if (!supervisorData) {
      return;
    }

    // This would typically use a Firestore listener
    // For now, we'll rely on the session validation
    setSupervisorStatus(supervisorData.status || 'active');
  }, [supervisorData]);

  return {
    supervisorStatus,
    isActive: supervisorStatus === 'active'
  };
};

export default useSessionValidation;
