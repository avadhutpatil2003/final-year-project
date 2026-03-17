import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Employees from '../pages/Employees';
import Supervisors from '../pages/Supervisors';
import Companies from '../pages/Companies';
import Stocks from '../pages/Stocks';
import Salary from '../pages/Salary';
import Attendance from '../pages/Attendance';
import Settings from '../pages/Settings';
import SalaryBilling from '../pages/SalaryBilling';
import SalaryReports from '../pages/SalaryReports';
import AdminLogin from '../pages/AdminLogin';
import AdminRegister from '../pages/AdminRegister';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/stocks" element={<Stocks />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/supervisors" element={<Supervisors />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/salary" element={<Salary />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/salary-billing" element={<SalaryBilling />} />
      <Route path="/salary-reports" element={<SalaryReports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/register" element={<AdminRegister />} />
    </Routes>
  );
};

export default AppRoutes;
