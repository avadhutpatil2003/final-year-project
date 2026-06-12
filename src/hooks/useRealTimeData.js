import { useState, useEffect, useCallback } from 'react';

const useRealTimeData = (initialData, updateInterval = 5000) => {
  const [data, setData] = useState(initialData);
  const [isLive, setIsLive] = useState(true);

  const generateRandomUpdate = useCallback(() => {

    return {
      totalCompanies: Math.max(40, Math.floor(45 + (Math.random() * 10 - 5))),
      activeCompanies: Math.max(25, Math.floor(32 + (Math.random() * 8 - 4))),
      totalShifts: Math.max(140, Math.floor(156 + (Math.random() * 20 - 10))),
      completedShifts: Math.max(130, Math.floor(142 + (Math.random() * 15 - 7))),
      attendanceRate: Math.max(85, Math.min(100, 94.2 + (Math.random() * 6 - 3))),
      incidentReports: Math.max(0, Math.floor(3 + (Math.random() * 4 - 2))),
      stockAlerts: Math.max(0, Math.floor(2 + (Math.random() * 3 - 1))),
      monthlyHours: Math.max(3000, Math.floor(3240 + (Math.random() * 400 - 200))),
      timestamp: new Date().toISOString()
    };
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setData(generateRandomUpdate());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isLive, updateInterval, generateRandomUpdate]);

  const toggleLive = () => setIsLive(!isLive);

  return { data, isLive, toggleLive };
};

export default useRealTimeData;
