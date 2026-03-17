import React from 'react';

const StatusBadge = ({ status, size = 'md' }) => {
  const statusConfig = {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-400'
    },
    inactive: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-400'
    },
    on_duty: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-400'
    },
    off_duty: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-400'
    },
    break: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-400'
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-400'
    },
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-400'
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-400'
    }
  };

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status] || statusConfig.inactive;
  
  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${config.bg} ${config.text} ${sizeConfig[size]}
    `}>
      <span className={`w-2 h-2 rounded-full mr-2 ${config.dot}`}></span>
      {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

export default StatusBadge;
