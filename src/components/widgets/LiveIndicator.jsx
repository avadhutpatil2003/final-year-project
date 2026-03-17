import React from 'react';

const LiveIndicator = ({ isLive, onToggle }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className={`text-sm font-medium ${isLive ? 'text-green-600' : 'text-gray-500'}`}>
          {isLive ? 'LIVE' : 'PAUSED'}
        </span>
      </div>
      <button
        onClick={onToggle}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          isLive 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {isLive ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
};

export default LiveIndicator;
