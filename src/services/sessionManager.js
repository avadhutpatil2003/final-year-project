import { db } from '../firebase';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

// Session Management for Supervisors
export class SessionManager {
  constructor() {
    this.activeSessionListeners = new Map();
  }

  // Create a session when supervisor logs in
  async createSession(supervisorId, supervisorEmail, sessionData = {}) {
    try {
      const sessionId = `session_${supervisorId}_${Date.now()}`;
      const sessionRef = doc(db, 'active_sessions', sessionId);
      
      const sessionInfo = {
        sessionId,
        supervisorId,
        supervisorEmail,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
        deviceInfo: sessionData.deviceInfo || 'Unknown',
        ipAddress: sessionData.ipAddress || 'Unknown',
        ...sessionData
      };

      await setDoc(sessionRef, sessionInfo);
      
      // Store session ID in localStorage for client-side reference
      localStorage.setItem('supervisorSessionId', sessionId);
      localStorage.setItem('supervisorId', supervisorId);
      
      console.log(`✅ Session created for supervisor: ${supervisorEmail}`);
      return { success: true, sessionId, sessionInfo };
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId) {
    try {
      if (!sessionId) return { success: false, error: 'No session ID provided' };
      
      const sessionRef = doc(db, 'active_sessions', sessionId);
      await setDoc(sessionRef, {
        lastActivity: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating session activity:', error);
      return { success: false, error: error.message };
    }
  }

  // End session (logout)
  async endSession(sessionId) {
    try {
      if (!sessionId) {
        // Try to get from localStorage
        sessionId = localStorage.getItem('supervisorSessionId');
      }
      
      if (!sessionId) {
        return { success: false, error: 'No session to end' };
      }

      const sessionRef = doc(db, 'active_sessions', sessionId);
      await deleteDoc(sessionRef);
      
      // Clear localStorage
      localStorage.removeItem('supervisorSessionId');
      localStorage.removeItem('supervisorId');
      
      console.log(`✅ Session ended: ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error ending session:', error);
      return { success: false, error: error.message };
    }
  }

  // Force logout all sessions for a specific supervisor
  async forceLogoutSupervisor(supervisorId) {
    try {
      const sessionsRef = collection(db, 'active_sessions');
      const q = query(sessionsRef, where('supervisorId', '==', supervisorId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Force logged out all sessions for supervisor: ${supervisorId}`);
      return { success: true, sessionsEnded: querySnapshot.size };
    } catch (error) {
      console.error('❌ Error force logging out supervisor:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active sessions for a supervisor
  async getActiveSessions(supervisorId) {
    try {
      const sessionsRef = collection(db, 'active_sessions');
      const q = query(sessionsRef, where('supervisorId', '==', supervisorId));
      const querySnapshot = await getDocs(q);
      
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, sessions };
    } catch (error) {
      console.error('❌ Error getting active sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Monitor supervisor status changes and force logout if inactive
  startSupervisorStatusMonitoring(supervisorId, onStatusChange) {
    try {
      const supervisorRef = doc(db, 'supervisors', supervisorId);
      
      const unsubscribe = onSnapshot(supervisorRef, async (doc) => {
        if (doc.exists()) {
          const supervisorData = doc.data();
          
          if (supervisorData.status === 'inactive') {
            console.log(`🚨 Supervisor ${supervisorId} marked as inactive - forcing logout`);
            
            // Force logout all sessions
            await this.forceLogoutSupervisor(supervisorId);
            
            // Notify the callback
            if (onStatusChange) {
              onStatusChange({
                status: 'inactive',
                action: 'force_logout',
                supervisorId: supervisorId,
                message: 'Your account has been deactivated. You will be logged out.'
              });
            }
          }
        }
      });

      // Store the unsubscribe function
      this.activeSessionListeners.set(supervisorId, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error starting supervisor status monitoring:', error);
      return null;
    }
  }

  // Stop monitoring supervisor status
  stopSupervisorStatusMonitoring(supervisorId) {
    const unsubscribe = this.activeSessionListeners.get(supervisorId);
    if (unsubscribe) {
      unsubscribe();
      this.activeSessionListeners.delete(supervisorId);
      console.log(`✅ Stopped monitoring supervisor: ${supervisorId}`);
    }
  }

  // Check if current session is valid
  async validateCurrentSession() {
    try {
      const sessionId = localStorage.getItem('supervisorSessionId');
      const supervisorId = localStorage.getItem('supervisorId');
      
      if (!sessionId || !supervisorId) {
        return { valid: false, reason: 'No session found' };
      }

      // Check if session exists in Firestore
      const sessionRef = doc(db, 'active_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        // Clear invalid session from localStorage
        localStorage.removeItem('supervisorSessionId');
        localStorage.removeItem('supervisorId');
        return { valid: false, reason: 'Session not found in database' };
      }

      // Check if supervisor is still active
      const supervisorRef = doc(db, 'supervisors', supervisorId);
      const supervisorDoc = await getDoc(supervisorRef);
      
      if (!supervisorDoc.exists() || supervisorDoc.data().status === 'inactive') {
        // End the session
        await this.endSession(sessionId);
        return { valid: false, reason: 'Supervisor account is inactive' };
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);
      
      return { 
        valid: true, 
        sessionData: sessionDoc.data(),
        supervisorData: supervisorDoc.data()
      };
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return { valid: false, reason: error.message };
    }
  }

  // Get all active sessions (for admin monitoring)
  async getAllActiveSessions() {
    try {
      const sessionsRef = collection(db, 'active_sessions');
      const querySnapshot = await getDocs(sessionsRef);
      
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, sessions };
    } catch (error) {
      console.error('❌ Error getting all active sessions:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

// Utility functions for easy access
export const createSupervisorSession = (supervisorId, supervisorEmail, sessionData) => 
  sessionManager.createSession(supervisorId, supervisorEmail, sessionData);

export const endSupervisorSession = (sessionId) => 
  sessionManager.endSession(sessionId);

export const forceLogoutSupervisor = (supervisorId) => 
  sessionManager.forceLogoutSupervisor(supervisorId);

export const validateCurrentSession = () => 
  sessionManager.validateCurrentSession();

export const startSupervisorMonitoring = (supervisorId, onStatusChange) => 
  sessionManager.startSupervisorStatusMonitoring(supervisorId, onStatusChange);

export default sessionManager;
