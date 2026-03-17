import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase';
import { 
  createSupervisorSession, 
  endSupervisorSession, 
  validateCurrentSession,
  startSupervisorMonitoring 
} from '../services/sessionManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supervisorData, setSupervisorData] = useState(null);
  const [sessionMonitoring, setSessionMonitoring] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Admin User',
          emailVerified: firebaseUser.emailVerified
        };
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (credentials, supervisorInfo = null) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      // If this is a supervisor login, create session and start monitoring
      if (supervisorInfo) {
        const sessionResult = await createSupervisorSession(
          supervisorInfo.id, 
          supervisorInfo.email,
          {
            deviceInfo: navigator.userAgent,
            loginMethod: 'email_password'
          }
        );

        if (sessionResult.success) {
          setSupervisorData(supervisorInfo);
          
          // Start monitoring supervisor status for automatic logout
          const unsubscribe = startSupervisorMonitoring(
            supervisorInfo.id, 
            handleSupervisorStatusChange
          );
          setSessionMonitoring(unsubscribe);
          
          console.log(`✅ Supervisor session created: ${supervisorInfo.name}`);
        }
      }
      
      // User will be set automatically by onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Handle supervisor status changes (force logout if inactive)
  const handleSupervisorStatusChange = async (statusData) => {
    if (statusData.status === 'inactive' && statusData.action === 'force_logout') {
      console.log('🚨 Supervisor account deactivated - forcing logout');
      
      // Show notification to user
      alert('Your account has been deactivated by an administrator. You will be logged out immediately.');
      
      // Force logout
      await forceLogout();
    }
  };

  const logout = async () => {
    try {
      // End supervisor session if exists
      if (supervisorData) {
        await endSupervisorSession();
        setSupervisorData(null);
      }

      // Stop session monitoring
      if (sessionMonitoring) {
        sessionMonitoring();
        setSessionMonitoring(null);
      }

      await signOut(auth);
      // User will be set to null automatically by onAuthStateChanged
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Force logout (used when supervisor is deactivated)
  const forceLogout = async () => {
    try {
      console.log('🚨 Force logout initiated');
      
      // End supervisor session
      if (supervisorData) {
        await endSupervisorSession();
        setSupervisorData(null);
      }

      // Stop session monitoring
      if (sessionMonitoring) {
        sessionMonitoring();
        setSessionMonitoring(null);
      }

      // Sign out from Firebase
      await signOut(auth);
      
      // Clear any remaining local storage
      localStorage.clear();
      
      // Redirect to login page
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Force logout error:', error);
      // Even if there's an error, redirect to login
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    supervisorData,
    login,
    logout,
    forceLogout,
    loading,
    validateCurrentSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
