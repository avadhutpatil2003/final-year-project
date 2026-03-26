import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BanknotesIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import DataTable from '../components/Table/DataTable';
import Modal from '../components/Modal/Modal';
import Notification from '../components/widgets/Notification';

export default function AdvanceManagement() {
  const [employees, setEmployees] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployeeAdvances, setSelectedEmployeeAdvances] = useState([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [advanceCount, setAdvanceCount] = useState(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState('advance'); // 'advance' | 'salary'
  const [historySupervisorId, setHistorySupervisorId] = useState('');
  const [salaryReports, setSalaryReports] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    givenBy: '',
    reason: ''
  });

  // Employee search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Fetch employees and supervisors
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees
        const employeesRef = collection(db, 'employees');
        const empSnapshot = await getDocs(employeesRef);
        const employeeData = empSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeeData);

        // Fetch supervisors
        const supervisorsRef = collection(db, 'supervisors');
        const supSnapshot = await getDocs(supervisorsRef);
        const supervisorData = supSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('✅ Supervisors fetched:', supervisorData);
        setSupervisors(supervisorData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Filter employees based on search term
  useEffect(() => {
    if (employeeSearchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const searchTerm = employeeSearchTerm.toLowerCase().trim();
      const filtered = employees.filter(emp => {
        const empName = emp.name || '';
        return empName.toLowerCase().includes(searchTerm);
      });
      setFilteredEmployees(filtered);
    }
  }, [employeeSearchTerm, employees]);

  // Fetch advances from advance_deduction_history collection (primary source)
  useEffect(() => {
    const fetchAdvances = async () => {
      setLoading(true);
      try {
        // Fetch from 'advance_deduction_history' collection
        const advancesRef = collection(db, 'advance_deduction_history');
        const snapshot = await getDocs(advancesRef);
        const advanceData = snapshot.docs.map(doc => {
          const data = doc.data();
          let dateValue = null;

          // Convert Firebase Timestamp to Date
          if (data.date?.toDate) {
            dateValue = data.date.toDate();
          } else if (data.date) {
            dateValue = new Date(data.date);
          }

          // Validate date
          if (dateValue && isNaN(dateValue.getTime())) {
            dateValue = null;
          }

          return {
            id: doc.id,
            ...data,
            date: dateValue,
            // Get employee name from employees collection
            employeeName: employees.find(emp => emp.id === data.employeeId)?.name || 'Unknown'
          };
        })
          .sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date - a.date;
          });

        console.log('✅ Advances fetched from advance_deduction_history:', advanceData);
        setAdvances(advanceData);
      } catch (error) {
        console.error('❌ Error fetching advances:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvances();
  }, [employees]);

  // Fetch salary reports for history modal (supervisor-wise salary slips)
  const fetchSalaryReports = async () => {
    try {
      setSalaryLoading(true);
      const salaryRef = collection(db, 'salary_reports');
      const snapshot = await getDocs(salaryRef);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('✅ Salary reports fetched for history:', reports.length);
      setSalaryReports(reports);
    } catch (error) {
      console.error('❌ Error fetching salary reports:', error);
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => {
    if (historyMode === 'salary' && salaryReports.length === 0) {
      fetchSalaryReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeId') {
      const selectedEmployee = employees.find(emp => emp.id === value);
      setFormData({
        ...formData,
        employeeId: value,
        employeeName: selectedEmployee?.name || ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.amount || !formData.givenBy) {
      setNotification({
        show: true,
        message: 'Please fill all required fields',
        type: 'error'
      });
      return;
    }

    try {
      console.log('🔄 Starting advance submission...');
      console.log('📝 Form data:', formData);

      const advanceData = {
        employeeId: formData.employeeId,
        amount: parseFloat(formData.amount),
        remainingAmount: parseFloat(formData.amount), // Initial remaining = full amount
        remainingAfterDeduction: parseFloat(formData.amount),
        date: Timestamp.fromDate(new Date(formData.date)),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        givenBy: formData.givenBy,
        reason: formData.reason || '',
        createdAt: Timestamp.now(),
        status: 'active',
        deductionHistory: [] // Track all deductions
      };

      console.log('💾 Advance data to save:', advanceData);
      console.log('📋 Employee ID:', formData.employeeId);
      console.log('📋 Employee Name:', formData.employeeName);

      // Create custom document ID using employeeId and timestamp
      // Format: emp1_1732123456789 (employeeId_timestamp)
      const customDocId = `${formData.employeeId}_${Date.now()}`;
      console.log('📝 Custom document ID:', customDocId);

      try {
        // 1️⃣ Save to advance_deduction_history collection with custom ID
        console.log('📤 Saving to advance_deduction_history...');
        await setDoc(doc(db, 'advance_deduction_history', customDocId), advanceData);
        console.log('✅ Saved to advance_deduction_history:', customDocId);

        // 2️⃣ Add to advances collection (for table display)
        const advancesData = {
          ...advanceData,
          employeeName: formData.employeeName, // Include name for display
          historyDocId: customDocId // Link to history record
        };
        console.log('📤 Saving to advances...');
        const advancesDocRef = await addDoc(collection(db, 'advances'), advancesData);
        console.log('✅ Saved to advances:', advancesDocRef.id);
      } catch (saveError) {
        console.error('❌ Error during save:', saveError);
        throw saveError;
      }

      // ❌ NO LONGER updating employee collection with advance data
      // All advance data is now stored in advance_deduction_history and advances collections
      console.log('✅ Advance saved successfully - employee collection not updated');

      setNotification({
        show: true,
        message: `✅ Advance of ₹${formData.amount} given to ${formData.employeeName}`,
        type: 'success',
        autoHide: true
      });

      // Reset form and close modal
      setFormData({
        employeeId: '',
        employeeName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        givenBy: '',
        reason: ''
      });

      // Refresh data from advance_deduction_history collection
      const advancesRef = collection(db, 'advance_deduction_history');
      const snapshot = await getDocs(advancesRef);
      const fetchedAdvances = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateValue = null;

        if (data.date?.toDate) {
          dateValue = data.date.toDate();
        } else if (data.date) {
          dateValue = new Date(data.date);
        }

        if (dateValue && isNaN(dateValue.getTime())) {
          dateValue = null;
        }

        return {
          id: doc.id,
          ...data,
          date: dateValue,
          employeeName: employees.find(emp => emp.id === data.employeeId)?.name || 'Unknown'
        };
      })
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date - a.date;
        });

      console.log('✅ Advances refreshed from advance_deduction_history:', fetchedAdvances);
      setAdvances(fetchedAdvances);

    } catch (error) {
      console.error('Error adding advance:', error);
      setNotification({
        show: true,
        message: '❌ Error adding advance: ' + error.message,
        type: 'error'
      });
    }
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const handleViewEmployeeAdvances = (employeeId, employeeName) => {
    try {
      // Filter advances from advances collection for this employee
      const employeeAdvances = advances
        .filter(adv => adv.employeeId === employeeId)
        .map(adv => ({
          ...adv,
          originalAdvanceAmount: adv.amount,
          employeeName: adv.employeeName || employeeName
        }))
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date - a.date; // Latest first
        });

      if (employeeAdvances.length === 0) {
        setNotification({
          show: true,
          message: '⚠️ No advance history found for this employee',
          type: 'warning'
        });
        return;
      }

      setSelectedEmployeeAdvances(employeeAdvances);
      setSelectedEmployeeName(employeeName);
      setAdvanceCount(employeeAdvances.length);
      setIsEmployeeModalOpen(true);

      console.log(`✅ Loaded ${employeeAdvances.length} advances for ${employeeName}:`, employeeAdvances);
    } catch (error) {
      console.error('Error loading employee advances:', error);
      setNotification({
        show: true,
        message: '❌ Error loading employee advances',
        type: 'error'
      });
    }
  };

  // Display employees with advances - calculated from advances collection
  const groupedAdvances = React.useMemo(() => {
    if (!advances || advances.length === 0) {
      console.log('⚠️ No advances found');
      return [];
    }

    console.log('📊 Processing advances for table:', advances.length);

    // Group advances by employee
    const employeeAdvancesMap = new Map();

    advances.forEach(advance => {
      const employeeId = advance.employeeId;
      // Get employee name from employees collection (advance_deduction_history doesn't store name)
      const employeeName = employees.find(emp => emp.id === employeeId)?.name || 'Unknown Employee';

      if (!employeeAdvancesMap.has(employeeId)) {
        employeeAdvancesMap.set(employeeId, {
          employeeId: employeeId,
          employeeName: employeeName,
          totalAmount: 0,
          latestAdvanceAmount: 0,
          totalRemaining: 0,
          lastDate: null,
          advances: []
        });
      }

      const empData = employeeAdvancesMap.get(employeeId);

      // Debug: Log advance data
      console.log(`📊 Processing advance for ${employeeName}:`, {
        amount: advance.amount,
        remainingAmount: advance.remainingAmount,
        remainingAfterDeduction: advance.remainingAfterDeduction,
        status: advance.status
      });

      // ✅ ONLY use advance_deduction_history fields:
      // Total Amount = sum of 'amount' field (original advance amount)
      const originalAmount = parseFloat(advance.amount || 0);
      empData.totalAmount += originalAmount;
      console.log(`   💰 Adding ₹${originalAmount} to total (new total: ₹${empData.totalAmount})`);

      // Remaining Amount = sum of 'remainingAmount' or 'remainingAfterDeduction' field
      // Only count if status is active (not fully_deducted)
      if (advance.status !== 'fully_deducted') {
        const remaining = parseFloat(
          advance.remainingAmount ||
          advance.remainingAfterDeduction ||
          0
        );
        empData.totalRemaining += remaining;
        console.log(`   💰 ${employeeName}: Remaining ₹${remaining} (status: ${advance.status})`);
      } else {
        console.log(`   ✅ ${employeeName}: Fully paid (status: ${advance.status})`);
      }

      // Update last date and store the most recent original amount (original advance issued)
      const advanceDate = advance.date instanceof Date ? advance.date : (advance.date?.toDate ? advance.date.toDate() : new Date(advance.date));
      if (!empData.lastDate || advanceDate > empData.lastDate) {
        empData.lastDate = advanceDate;
        empData.latestAdvanceAmount = originalAmount;
      }

      empData.advances.push(advance);
    });

    // Convert map to array and sort by date
    const result = Array.from(employeeAdvancesMap.values())
      .sort((a, b) => {
        const dateA = a.lastDate || new Date(0);
        const dateB = b.lastDate || new Date(0);
        return dateB - dateA;
      });

    console.log('📋 Grouped advances for display:', result);
    return result;
  }, [advances, employees]);

  // Filtering for Complete History modal (by supervisor + mode)
  const selectedSupervisorNameForHistory = React.useMemo(() => {
    if (!historySupervisorId) return '';
    const sup = supervisors.find(s => s.id === historySupervisorId);
    return (sup?.name || '').toLowerCase();
  }, [historySupervisorId, supervisors]);

  const advancesForHistory = React.useMemo(() => {
    if (!selectedSupervisorNameForHistory) return advances;
    return advances.filter(adv => (adv.givenBy || '').toLowerCase() === selectedSupervisorNameForHistory);
  }, [advances, selectedSupervisorNameForHistory]);

  const salaryForHistory = React.useMemo(() => {
    if (!selectedSupervisorNameForHistory) return salaryReports;
    return salaryReports.filter(report => (report.preparedBy || '').toLowerCase() === selectedSupervisorNameForHistory);
  }, [salaryReports, selectedSupervisorNameForHistory]);

  const columns = [
    {
      key: 'employeeName',
      label: 'Employee',
      render: (name, item) => (
        <button
          onClick={() => handleViewEmployeeAdvances(item.employeeId, name)}
          className="flex items-center hover:text-blue-600 transition-colors"
        >
          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900 hover:underline">{name}</span>
        </button>
      )
    },
    {
      key: 'latestAdvanceAmount',
      label: 'Original Amount',
      render: (amount) => (
        <span className="text-lg font-bold text-green-600">
          ₹{(amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'totalRemaining',
      label: 'Remaining Amount',
      render: (amount) => (
        <span className="text-lg font-bold text-orange-600">
          ₹{(amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'lastDate',
      label: 'Last Advance Date',
      render: (date) => (
        <div className="flex items-center text-sm text-gray-600">
          <CalendarIcon className="h-4 w-4 mr-1" />
          {date ? date.toLocaleDateString('en-IN') : 'N/A'}
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Advance</h1>
          <p className="text-gray-600 mt-1">Give advance and track employee advances</p>
        </div>
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center shadow-md"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Salary / Advance History
        </button>
      </div>

      {/* Give Advance Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Give Advance to Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee *
            </label>
            <input
              type="text"
              value={employeeSearchTerm}
              onChange={(e) => {
                setEmployeeSearchTerm(e.target.value);
                setShowEmployeeDropdown(true);
              }}
              onFocus={() => setShowEmployeeDropdown(true)}
              onDoubleClick={() => setShowEmployeeDropdown(false)}
              onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
              placeholder="Search employee by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />

            {/* Dropdown suggestions */}
            {showEmployeeDropdown && filteredEmployees.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setEmployeeSearchTerm(emp.name);
                      setShowEmployeeDropdown(false);
                      setFormData({
                        ...formData,
                        employeeId: emp.id,
                        employeeName: emp.name
                      });
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{emp.name}</div>
                    {emp.phone && (
                      <div className="text-sm text-gray-500">{emp.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {showEmployeeDropdown && employeeSearchTerm && filteredEmployees.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="px-4 py-3 text-gray-500 text-center">
                  No employees found for "{employeeSearchTerm}"
                </div>
              </div>
            )}
          </div>

          {/* Given By - Supervisor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Given By (Supervisor) *
            </label>
            <select
              name="givenBy"
              value={formData.givenBy}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select Supervisor</option>
              {/* Fetch supervisors from Firebase */}
              {supervisors.length > 0 ? (
                supervisors.map(sup => (
                  <option key={sup.id} value={sup.name}>
                    {sup.name} {sup.designation ? `- ${sup.designation}` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading supervisors...</option>
              )}
            </select>
          </div>

          {/* Date and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <BanknotesIcon className="h-5 w-5 mr-2" />
              Give Advance
            </button>
          </div>
        </form>
      </div>

      {/* Advances Table - All Employees with Advances */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Employees with Advances</h3>
          <p className="text-sm text-gray-600 mt-1">All employees who have received advances - Click on name to view history</p>
        </div>
        <DataTable
          columns={columns}
          data={groupedAdvances}
          loading={loading}
          emptyMessage="No advances given yet"
        />
      </div>

      {/* Employee Advances Modal - Table Format */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title={`${selectedEmployeeName} - Advance History`}
        size="large"
      >
        <div className="space-y-4">
          {/* Advance Count Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Advances Received</p>
                  <p className="text-3xl font-bold text-blue-600">{advanceCount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{selectedEmployeeAdvances.reduce((sum, adv) => sum + (parseFloat(adv.originalAdvanceAmount || adv.amount) || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Advances Table */}
          {selectedEmployeeAdvances.length > 0 ? (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction / Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Given By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEmployeeAdvances.map((advance, index) => {
                    const originalAmount = parseFloat(advance.amount || 0);
                    const remainingAmount = parseFloat(advance.remainingAfterDeduction || advance.remainingAmount || advance.amount || 0);
                    const isFullyPaid = remainingAmount === 0 || advance.status === 'fully_deducted';
                    const deductionHistory = Array.isArray(advance.deductionHistory) ? [...advance.deductionHistory] : [];
                    deductionHistory.sort((a, b) => {
                      const dateA = a.date ? new Date(a.date) : new Date(a.year || 0, (a.month || 1) - 1, 1);
                      const dateB = b.date ? new Date(b.date) : new Date(b.year || 0, (b.month || 1) - 1, 1);
                      return dateB - dateA;
                    });

                    return (
                      <tr key={advance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-lg font-bold text-gray-700">
                            ₹{originalAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-lg font-bold ${isFullyPaid ? 'text-gray-400' : 'text-green-600'}`}>
                            ₹{remainingAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {deductionHistory.length > 0 ? (
                            <div className="space-y-1">
                              {deductionHistory.map((entry, entryIndex) => {
                                const monthLabel = entry.monthName || (entry.month ? getMonthName(entry.month) : '');
                                const yearLabel = entry.year || '';
                                const amountValue = parseFloat(entry.amount || entry.advance || 0) || 0;
                                const dateLabel = entry.date
                                  ? new Date(entry.date).toLocaleDateString('en-IN')
                                  : entry.deductionDate || (entry.month && entry.year ? `${entry.month}/${entry.year}` : 'N/A');
                                return (
                                  <div key={`${advance.id}-deduction-${entryIndex}`} className="flex flex-col rounded border border-gray-100 p-2 bg-gray-50">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span className="font-semibold text-gray-700">
                                        {monthLabel ? `${monthLabel} ${yearLabel}` : dateLabel}
                                      </span>
                                      <span>{dateLabel}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      ₹{amountValue.toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No deductions yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {advance.date && advance.date instanceof Date && !isNaN(advance.date)
                              ? advance.date.toLocaleDateString('en-IN')
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {advance.givenBy || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No advance history found
            </div>
          )}
        </div>
      </Modal>

      {/* History Modal - All Advances */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Complete Advance History"
        size="large"
      >
        <div className="space-y-4">
          {/* Mode Toggle + Supervisor Filter */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <p className="text-base font-semibold text-gray-800 uppercase tracking-wide">Select View</p>
              <div className="inline-flex rounded-full shadow-sm overflow-hidden border border-gray-200 text-base">
                <button
                  type="button"
                  onClick={() => setHistoryMode('advance')}
                  className={`px-6 py-2 font-semibold transition ${historyMode === 'advance' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  Advance History
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryMode('salary')}
                  className={`px-6 py-2 font-semibold border-l border-gray-200 transition ${historyMode === 'salary' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  Salary History
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3">
              <label className="text-base font-medium text-gray-700" htmlFor="history-supervisor-select">
                Supervisor
              </label>
              <select
                id="history-supervisor-select"
                className="px-5 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-60"
                value={historySupervisorId}
                onChange={(e) => setHistorySupervisorId(e.target.value)}
              >
                <option value="">All Supervisors</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* History List */}
          {historyMode === 'advance' ? (
            advancesForHistory.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {advancesForHistory.map((advance, index) => {
                      // Get employee name from employees array
                      const employee = employees.find(emp => emp.id === advance.employeeId);
                      const employeeName = employee?.name || 'Unknown Employee';
                      const amount = parseFloat(advance.amount || 0) || 0;
                      const dateText =
                        advance.date && advance.date instanceof Date && !isNaN(advance.date)
                          ? advance.date.toLocaleDateString('en-IN')
                          : 'N/A';

                      return (
                        <tr key={advance.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {employeeName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                            ₹{amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {dateText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No advance history found
              </div>
            )
          ) : salaryLoading ? (
            <div className="text-center py-8 text-gray-500">Loading salary history...</div>
          ) : salaryForHistory.length > 0 ? (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount (₹)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salaryForHistory.map((report, index) => {
                    const employeeName = report.employeeName || 'Unknown Employee';
                    const amount = parseFloat(report.totalAmount || report.netSalary || 0) || 0;
                    const rawDate = report.savedAt || report.generatedDate || report.createdAt;
                    const dateText = rawDate ? new Date(rawDate).toLocaleDateString('en-IN') : 'N/A';

                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employeeName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                          ₹{amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {dateText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No salary history found</div>
          )}
        </div>
      </Modal>

      {/* Notification */}
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
}
