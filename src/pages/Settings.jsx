import React from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 transition-colors duration-200">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your application preferences</p>
      </div>

      {/* Settings Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Data Refresh Interval */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-300 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Data Refresh Interval
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Auto refresh every 60 seconds
                </p>
              </div>
            </div>
            <CheckCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
          </div>
        </div>

      </div>

      {/* Info Footer */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 All settings are automatically saved to your browser and will persist across sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
