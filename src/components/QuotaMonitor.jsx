import React, { useState, useEffect } from 'react';

const QuotaMonitor = () => {
  const [quotaUsage, setQuotaUsage] = useState({
    reads: 0,
    writes: 0,
    deletes: 0,
    lastReset: new Date().toDateString()
  });

  const DAILY_LIMITS = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  useEffect(() => {
    // Load quota usage from localStorage
    const savedQuota = localStorage.getItem('firestore_quota_usage');
    if (savedQuota) {
      const parsed = JSON.parse(savedQuota);
      
      // Reset if it's a new day
      const today = new Date().toDateString();
      if (parsed.lastReset !== today) {
        const resetQuota = {
          reads: 0,
          writes: 0,
          deletes: 0,
          lastReset: today
        };
        setQuotaUsage(resetQuota);
        localStorage.setItem('firestore_quota_usage', JSON.stringify(resetQuota));
      } else {
        setQuotaUsage(parsed);
      }
    }
  }, []);

  const updateQuotaUsage = (operation, count = 1) => {
    setQuotaUsage(prev => {
      const updated = {
        ...prev,
        [operation]: prev[operation] + count
      };
      localStorage.setItem('firestore_quota_usage', JSON.stringify(updated));
      return updated;
    });
  };

  const getUsagePercentage = (operation) => {
    return Math.min((quotaUsage[operation] / DAILY_LIMITS[operation]) * 100, 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage < 50) return 'text-green-600 bg-green-100';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const resetQuota = () => {
    const resetQuota = {
      reads: 0,
      writes: 0,
      deletes: 0,
      lastReset: new Date().toDateString()
    };
    setQuotaUsage(resetQuota);
    localStorage.setItem('firestore_quota_usage', JSON.stringify(resetQuota));
  };

  // Expose updateQuotaUsage globally for other components to use
  useEffect(() => {
    window.updateFirestoreQuota = updateQuotaUsage;
    return () => {
      delete window.updateFirestoreQuota;
    };
  }, []);

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">📊 Firebase Quota Usage</h3>
        <button
          onClick={resetQuota}
          className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-3">
        {Object.entries(DAILY_LIMITS).map(([operation, limit]) => {
          const usage = quotaUsage[operation];
          const percentage = getUsagePercentage(operation);
          const statusColor = getStatusColor(percentage);
          
          return (
            <div key={operation} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize font-medium">{operation}:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                  {usage.toLocaleString()} / {limit.toLocaleString()} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    percentage < 50 ? 'bg-green-500' :
                    percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Last reset: {quotaUsage.lastReset}
      </div>
      
      {Object.values(quotaUsage).some((usage, index) => 
        usage / Object.values(DAILY_LIMITS)[index] > 0.8
      ) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ⚠️ Warning: Approaching daily limits! Consider optimizing operations.
        </div>
      )}
    </div>
  );
};

export default QuotaMonitor;
