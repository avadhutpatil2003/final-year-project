import React, { useState, useEffect } from 'react';
import Input from '../Forms/Input';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  CurrencyDollarIcon,
  UserIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AddSalaryForm = ({ onAdd, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    month: '',
    year: '',
    basicSalary: '',
    allowances: '',
    deductions: '',
    overtimeHours: '',
    overtimeRate: '',
    totalSalary: '',
    working: true,
    workingDays: ''
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch employees from Firebase
  useEffect(() => {
    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeeData = [];
      querySnapshot.forEach((doc) => {
        employeeData.push({ id: doc.id, ...doc.data() });
      });
      setEmployees(employeeData);
    }, (error) => {
      console.error('Error fetching employees:', error);
    });

    return () => unsubscribe();
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name
      }));
    }
  };

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId || '',
        employeeName: initialData.employeeName || '',
        month: initialData.month || '',
        year: initialData.year || '',
        basicSalary: initialData.basicSalary || '',
        allowances: initialData.allowances || '',
        deductions: initialData.deductions || '',
        overtimeHours: initialData.overtimeHours || '',
        overtimeRate: initialData.overtimeRate || '',
        totalSalary: initialData.totalSalary || '',
        working: initialData.working !== undefined ? initialData.working : true,
        workingDays: initialData.workingDays || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const calculateTotalSalary = () => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const overtime = (parseFloat(formData.overtimeHours) || 0) * (parseFloat(formData.overtimeRate) || 0);

    const total = basic + allowances + overtime - deductions;
    setFormData(prev => ({ ...prev, totalSalary: total.toFixed(2) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    calculateTotalSalary();
    onAdd(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Employee Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="employeeSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
            <select
              id="employeeSelect"
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} (ID: {employee.id})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Employee Name"
            id="employeeName"
            value={formData.employeeName}
            onChange={handleChange}
            placeholder="Auto-filled from employee selection"
            icon={UserIcon}
            readOnly
          />
        </div>
        <div className="mt-4">
          <Input
            label="Employee ID"
            id="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            placeholder="Auto-filled from employee selection"
            icon={UserIcon}
            readOnly
          />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Salary Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              id="month"
              value={formData.month}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select Month</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <Input
            label="Year"
            id="year"
            value={formData.year}
            onChange={handleChange}
            placeholder="Enter year (e.g., 2024)"
            required
            icon={CalendarDaysIcon}
          />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Salary Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Basic Salary"
            id="basicSalary"
            type="number"
            step="0.01"
            value={formData.basicSalary}
            onChange={handleChange}
            placeholder="Enter basic salary"
            required
            icon={CurrencyDollarIcon}
          />
          <Input
            label="Allowances"
            id="allowances"
            type="number"
            step="0.01"
            value={formData.allowances}
            onChange={handleChange}
            placeholder="Enter allowances"
            icon={CurrencyDollarIcon}
          />
          <Input
            label="Deductions"
            id="deductions"
            type="number"
            step="0.01"
            value={formData.deductions}
            onChange={handleChange}
            placeholder="Enter deductions"
            icon={CurrencyDollarIcon}
          />
          <Input
            label="Overtime Hours"
            id="overtimeHours"
            type="number"
            step="0.01"
            value={formData.overtimeHours}
            onChange={handleChange}
            placeholder="Enter overtime hours"
            icon={ClockIcon}
          />
          <Input
            label="Overtime Rate (per hour)"
            id="overtimeRate"
            type="number"
            step="0.01"
            value={formData.overtimeRate}
            onChange={handleChange}
            placeholder="Enter overtime rate"
            icon={CurrencyDollarIcon}
          />
        </div>
      </div>

      {/* <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Employment Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="working"
              checked={formData.working}
              onChange={(e) => setFormData(prev => ({ ...prev, working: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="working" className="ml-2 block text-sm text-gray-900">
              Currently Working
            </label>
          </div>
          <Input
            label="Working Days"
            id="workingDays"
            type="number"
            min="0"
            max="31"
            value={formData.workingDays}
            onChange={handleChange}
            placeholder="Enter working days (0-31)"
            icon={CalendarDaysIcon}
          />
        </div>
      </div> */}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Total Salary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Total Salary"
              id="totalSalary"
              value={formData.totalSalary}
              onChange={handleChange}
              placeholder="Total salary will be calculated automatically"
              icon={CurrencyDollarIcon}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? 'Update Salary' : 'Add Salary'}
        </button>
      </div>
    </form>
  );
};

export default AddSalaryForm;
