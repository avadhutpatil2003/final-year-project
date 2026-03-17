import React, { useState, useEffect } from 'react';
import { sessionManager } from '../../services/sessionManager';
import { 
  ComputerDesktopIcon, 
  ClockIcon, 
  UserIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const ActiveSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadActiveSessions();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveSessions, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      const result = await sessionManager.getAllActiveSessions();
      
      if (result.success) {
        setSessions(result.sessions);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async (session) => {
    if (window.confirm(`Force logout ${session.supervisorEmail}?`)) {
      try {
        const result = await sessionManager.forceLogoutSupervisor(session.supervisorId);
        if (result.success) {
          alert(`Successfully logged out ${session.supervisorEmail}`);
          loadActiveSessions(); // Refresh the list
        } else {
          alert(`Failed to logout: ${result.error}`);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSessionDuration = (loginTime) => {
    const now = new Date();
    const login = new Date(loginTime);
    const diffMs = now - login;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Sessions</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Sessions</h3>
        <div className="text-red-600">Error loading sessions: {error}</div>
        <button 
          onClick={loadActiveSessions}
          className="mt-2 text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Active Sessions ({sessions.length})
          </h3>
          <button
            onClick={loadActiveSessions}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
            <p className="mt-1 text-sm text-gray-500">
              No supervisors are currently logged in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <ComputerDesktopIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {session.supervisorEmail}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {session.supervisorId}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Login: {formatTime(session.loginTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Duration: {getSessionDuration(session.loginTime)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                  <button
                    onClick={() => handleForceLogout(session)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="Force Logout"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessions;
