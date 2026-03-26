
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CalculatorIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  GiftIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { companyData } from '../../data/companyData';
import jmsLogo from '../../assets/logos/AP logo.jpg';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  // Use the first company from static companyData (Jay Maharashtra Security)
  const currentCompany = companyData["jay-maharashtra-security"];

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
    { name: 'Employees', path: '/employees', icon: UsersIcon },
    { name: 'Supervisors', path: '/supervisors', icon: UserGroupIcon },
    { name: 'Companies', path: '/companies', icon: BuildingOfficeIcon },
    { name: 'Attendance', path: '/attendance', icon: CalendarDaysIcon },
    { name: 'Employee Salary', path: '/salary-billing', icon: DocumentTextIcon },
    { name: 'Salary Advance', path: '/advance-management', icon: BanknotesIcon },
    { name: 'Salary Report', path: '/salary-reports', icon: CalculatorIcon },
    { name: 'Accessories', path: '/issue-items', icon: GiftIcon },
    // { name: 'Billing', path: '/billing', icon: DocumentTextIcon },
    { name: 'Events', path: '/events', icon: CalendarIcon },
    { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
  ];

  const handleLogout = () => {
    logout();
    // Optionally redirect to login page
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center h-20 border-b border-gray-200 dark:border-gray-700 p-3">
          <img
            src={jmsLogo}
            alt="Jay Maharashtra Security Services"
            className="h-12 w-auto object-contain"
          />
          <div className="ml-3 flex-1">
            <div className="text-base font-bold text-gray-900 dark:text-white">AP</div>
            <div className="text-base font-bold text-gray-900 dark:text-white">Security Services</div>
          </div>
        </div>

        {/* Navigation - Scrollable with padding for address */}
        <nav className="flex-1 overflow-y-auto pb-24 mt-8">
          <div className="px-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-r-2 border-primary-600 dark:border-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400'
                  }`
                }
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Company Address - Bottom */}
        {currentCompany && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed break-words">
              {currentCompany.address}
            </div>
          </div>
        )}


      </div>
    </>
  );
};

export default Sidebar;
