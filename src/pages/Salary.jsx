import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import AddSalaryForm from '../components/Forms/AddSalaryForm';
import Modal from '../components/Modal/Modal';
import DataTable from '../components/Table/DataTable';
import Notification from '../components/widgets/Notification';
import { api } from '../services/api';

export default function Salary() {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: ''
  });

  // 🔹 Fetch salaries from Firestore
  useEffect(() => {
    let unsubscribe;

    if (!db) {
      console.error('Firebase database not initialized');
      setLoading(false);
      return;
    }

    try {
      const salariesRef = collection(db, 'salaries');
      
      // Use simple query to avoid composite index requirement
      let q;
      try {
        q = query(salariesRef, orderBy('year', 'desc'));
      } catch (orderError) {
        console.warn('⚠️ OrderBy query failed, using collection without ordering:', orderError);
        q = salariesRef;
      }

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const salaryData = [];
          querySnapshot.forEach((doc) => {
            salaryData.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort client-side to avoid composite index requirement
          salaryData.sort((a, b) => {
            if (a.year !== b.year) {
              return (b.year || 0) - (a.year || 0);
            }
            return (b.month || 0) - (a.month || 0);
          });
          
          setSalaries(salaryData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching salaries:', error);
          setSalaries([]); // No notification, just empty array
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up salaries listener:', error);
      setSalaries([]); // No notification
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 🔹 Salary statistics
  const salaryStats = useMemo(() => ({
    total: salaries.length,
    totalAmount: salaries.reduce((sum, salary) => sum + (parseFloat(salary.totalSalary) || 0), 0)
  }), [salaries]);

  // 🔹 Add or update salary
  const handleAddSalary = async (newSalary) => {
    setIsModalOpen(false);
    setEditingSalary(null);

    try {
      const salaryData = { ...newSalary, createdAt: new Date().toISOString() };
      if (editingSalary) {
        await api.updateSalary(editingSalary.id, salaryData);
        setNotification({ show: true, message: 'Salary updated successfully!', type: 'success', autoHide: true });
      } else {
        await api.addSalary(salaryData);
        setNotification({ show: true, message: 'Salary added successfully!', type: 'success', autoHide: true });
      }
    } catch (error) {
      console.error('Error saving salary: ', error);
      setNotification({
        show: true,
        message: `Failed to ${editingSalary ? 'update' : 'add'} salary. Please check Firebase.`,
        type: 'error',
        autoHide: true
      });
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingSalary(null);
  };

  const handleDisplaySalary = (salary) => {
    setSelectedSalary(salary);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSalary(null);
  };

  const handleEditSalary = (salary) => {
    setEditingSalary(salary);
    setIsModalOpen(true);
  };

  const handleDeleteSalary = async (salary) => {
    if (window.confirm(`Are you sure you want to delete salary record for ${salary.employeeName}?`)) {
      try {
        await api.deleteSalary(salary.id);
        setNotification({ show: true, message: 'Salary deleted successfully!', type: 'success' });
      } catch (error) {
        console.error('Error deleting salary:', error);
        setNotification({ show: true, message: 'Failed to delete salary.', type: 'error' });
      }
    }
  };

  // 🔹 Table Columns
  const salaryColumns = [
    {
      key: 'employeeName',
      label: 'Employee',
      render: (employeeName, item) => (
        <div>
          <div className="font-medium text-gray-900">{employeeName}</div>
          <div className="text-sm text-gray-500">ID: {item.employeeId}</div>
        </div>
      )
    },
    {
      key: 'month',
      label: 'Month/Year',
      render: (month, item) => `${month}/${item.year}`
    },
    {
      key: 'basicSalary',
      label: 'Basic Salary',
      render: (basicSalary) => `₹${parseFloat(basicSalary || 0).toFixed(2)}`
    },
    {
      key: 'totalSalary',
      label: 'Total Salary',
      render: (totalSalary) => `₹${parseFloat(totalSalary || 0).toFixed(2)}`
    },
    {
      key: 'workingDays',
      label: 'Working Days',
      render: (workingDays) => workingDays ? `${workingDays} days` : 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center space-x-2">
          <button onClick={(e) => { e.stopPropagation(); handleDisplaySalary(item); }}
            className="p-2 rounded-full bg-green-700 text-white hover:bg-green-800 shadow-md" title="Display Details">
            <EyeIcon className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleEditSalary(item); }}
            className="p-2 rounded-full bg-blue-700 text-white hover:bg-blue-800 shadow-md" title="Edit">
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteSalary(item); }}
            className="p-2 rounded-full bg-red-700 text-white hover:bg-red-800 shadow-md" title="Delete">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
        <p className="text-gray-600 mt-1">Manage and calculate employee salaries</p>
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <DataTable
        data={salaries}
        columns={salaryColumns}
        title="Salary Records"
        searchable
        sortable
        pagination
        itemsPerPage={10}
      />

      <Modal isOpen={isModalOpen} onClose={handleCancel} title={editingSalary ? 'Edit Salary' : 'Add New Salary'}>
        <AddSalaryForm onAdd={handleAddSalary} onCancel={handleCancel} initialData={editingSalary} />
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title="Salary Details">
        {selectedSalary && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedSalary.employeeName}</h3>
              <p className="text-gray-600">Employee ID: {selectedSalary.employeeId}</p>
              <p className="text-gray-600">Period: {selectedSalary.month}/{selectedSalary.year}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
                <p className="mt-1 text-sm text-gray-900">₹{parseFloat(selectedSalary.basicSalary || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allowances</label>
                <p className="mt-1 text-sm text-gray-900">₹{parseFloat(selectedSalary.allowances || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Deductions</label>
                <p className="mt-1 text-sm text-gray-900">₹{parseFloat(selectedSalary.deductions || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Overtime</label>
                <p className="mt-1 text-sm text-gray-900">
                  {parseFloat(selectedSalary.overtimeHours || 0)} hrs × ₹{parseFloat(selectedSalary.overtimeRate || 0).toFixed(2)}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Total Salary</label>
                <p className="mt-1 text-lg font-bold text-green-600">₹{parseFloat(selectedSalary.totalSalary || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Working Days</label>
                <p className="mt-1 text-sm text-gray-900">{selectedSalary.workingDays ? `${selectedSalary.workingDays} days` : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
