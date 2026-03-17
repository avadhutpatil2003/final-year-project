import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  UserPlusIcon,
  UsersIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import AddSupervisorForm from '../components/Forms/AddSupervisorForm';
import Modal from '../components/Modal/Modal';
import DataTable from '../components/Table/DataTable';
import Notification from '../components/widgets/Notification';
import StatCard from '../components/CardStats/StatCard';
import SupervisorLocationMap from '../components/SupervisorLocationMap';


const formatDateSafe = (value) => {
  if (!value) return '';
  try {
    if (value.toDate) {
      return value.toDate().toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      return value.split('T')[0];
    }
    return String(value).split('T')[0];
  } catch {
    return '';
  }
};

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationSupervisor, setLocationSupervisor] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: ''
  });

  // 🔹 Fetch supervisors from Firestore (Realtime)
  useEffect(() => {
    const supervisorsRef = collection(db, 'supervisors');
    let q;
    try {
      q = query(supervisorsRef, orderBy('createdAt', 'desc'));
    } catch {
      q = supervisorsRef;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setSupervisors(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching supervisors:', error);
        setNotification({
          show: true,
          message: 'Error loading supervisors: ' + error.message,
          type: 'error'
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 🔹 Fetch companies from Firestore
  useEffect(() => {
    const companiesRef = collection(db, 'companies');
    const unsubscribe = onSnapshot(
      companiesRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCompanies(data);
        setLoadingCompanies(false);
      },
      (error) => {
        console.error('Error fetching companies:', error);
        setLoadingCompanies(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 🔹 Stats
  const supervisorStats = {
    total: supervisors.length,
    active: supervisors.filter((s) => s.status === 'active').length,
    inactive: supervisors.filter((s) => s.status === 'inactive').length
  };

  // 🔹 Add or Update Supervisor
  const handleAddSupervisor = async (newSupervisor) => {
    console.log('Adding/Updating supervisor:', newSupervisor);
    console.log('Company Assignment:', newSupervisor.assignedCompany);

    try {
      const nowIso = new Date().toISOString();
      const newEmail = newSupervisor.email.toLowerCase().trim();
      const newDocId = newEmail;

      if (editingSupervisor) {
        // 🔹 UPDATE EXISTING SUPERVISOR
        const oldDocId = editingSupervisor.id;
        const oldEmail = editingSupervisor.email?.toLowerCase().trim();

        console.log(`Updating supervisor. Old ID: ${oldDocId}, New Email: ${newEmail}`);

        // Check if email is changing
        const isEmailChanging = newEmail !== oldEmail;

        if (isEmailChanging) {
          // Check if the new email is already taken by ANOTHER supervisor
          const duplicateEmail = supervisors.find(s => s.id === newDocId || s.email?.toLowerCase().trim() === newDocId);
          if (duplicateEmail && duplicateEmail.id !== oldDocId) {
            throw new Error('A supervisor with this new email already exists');
          }

          console.log('📧 Email changed. Migrating document ID...');

          // Prepare data for the new document
          const migratedData = {
            ...editingSupervisor, // Start with all old data
            ...newSupervisor,      // Overwrite with new form data
            email: newEmail,       // Ensure email is correct
            updatedAt: nowIso,
            id: newDocId           // Set the new ID
          };

          // Create new document with new email as ID
          const newRef = doc(db, 'supervisors', newDocId);
          await setDoc(newRef, migratedData);
          console.log('✅ Created new document with migrated ID:', newDocId);

          // Delete old document
          const oldRef = doc(db, 'supervisors', oldDocId);
          await deleteDoc(oldRef);
          console.log('🗑️ Deleted old document:', oldDocId);
        } else {
          // Email not changing, just update the existing document
          const ref = doc(db, 'supervisors', oldDocId);

          // Prepare update data - preserve important fields
          const updateData = {
            ...newSupervisor,
            updatedAt: nowIso,
            // Explicitly preserve these if they were in editingSupervisor
            status: editingSupervisor.status || 'active',
            createdAt: editingSupervisor.createdAt || nowIso,
            registrationDate: editingSupervisor.registrationDate || nowIso
          };

          await updateDoc(ref, updateData);
          console.log('✅ Successfully updated supervisor:', oldDocId);
        }

        setNotification({
          show: true,
          message: isEmailChanging ? 'Supervisor email updated and record migrated!' : 'Supervisor updated successfully!',
          type: 'success',
          autoHide: true
        });
      } else {
        // 🔹 CREATE NEW SUPERVISOR
        if (!newSupervisor.name) throw new Error('Supervisor name is required');
        if (!newSupervisor.email) throw new Error('Supervisor email is required');

        console.log('📧 Creating new supervisor with email-based ID:', newDocId);

        // Check if supervisor with same email already exists (by ID or field)
        const existingDoc = supervisors.find(s => s.id === newDocId || s.email?.toLowerCase().trim() === newDocId);
        if (existingDoc) {
          throw new Error('A supervisor with this email already exists');
        }

        const supervisorData = {
          ...newSupervisor,
          email: newEmail,
          status: 'active',
          createdAt: nowIso,
          updatedAt: nowIso,
          registrationDate: nowIso
        };

        const ref = doc(db, 'supervisors', newDocId);
        await setDoc(ref, supervisorData);
        console.log('✅ Successfully created supervisor with email ID:', newDocId);

        setNotification({
          show: true,
          message: 'Supervisor added successfully!',
          type: 'success',
          autoHide: true
        });
      }

      // Close modal and reset state on success
      setIsModalOpen(false);
      setEditingSupervisor(null);
    } catch (error) {
      console.error('Error saving supervisor:', error);
      setNotification({
        show: true,
        message: `Error: ${error.message || 'Failed to save supervisor.'}`,
        type: 'error',
        autoHide: true
      });
      // Keep modal open on error
      setIsModalOpen(true);
      setEditingSupervisor(editingSupervisor);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingSupervisor(null);
  };

  const handleDisplaySupervisor = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSupervisor(null);
  };

  const handleViewLocation = (supervisor) => {
    setLocationSupervisor(supervisor);
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
    setLocationSupervisor(null);
  };

  const togglePasswordVisibility = (supervisorId) => {
    const newVisible = new Set(visiblePasswords);
    newVisible.has(supervisorId)
      ? newVisible.delete(supervisorId)
      : newVisible.add(supervisorId);
    setVisiblePasswords(newVisible);
  };

  // 🔹 Edit Supervisor
  const handleEditSupervisor = (supervisor) => {
    setEditingSupervisor(supervisor);
    setIsModalOpen(true);
  };

  // 🔹 Delete Supervisor
  const handleDeleteSupervisor = async (supervisor) => {
    if (window.confirm(`Delete ${supervisor.name}? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'supervisors', supervisor.id));
        setNotification({
          show: true,
          message: 'Supervisor deleted successfully!',
          type: 'success'
        });
      } catch (error) {
        console.error('Error deleting supervisor:', error);
        setNotification({
          show: true,
          message: 'Error deleting supervisor: ' + error.message,
          type: 'error'
        });
      }
    }
  };

  // 🔹 Activate / Deactivate Supervisor
  const handleToggleSupervisorStatus = async (supervisor) => {
    const isDeactivating = supervisor.status === 'active';
    const action = isDeactivating ? 'Deactivate' : 'Activate';

    const confirmMsg = isDeactivating
      ? `Are you sure you want to deactivate ${supervisor.name}?\n\n⚠️ This will immediately log them out and block login access.`
      : `Are you sure you want to activate ${supervisor.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const ref = doc(db, 'supervisors', supervisor.id);
      const nowIso = new Date().toISOString();
      const updatedData = {
        status: isDeactivating ? 'inactive' : 'active',
        updatedAt: nowIso,
        ...(isDeactivating
          ? {
            deactivatedAt: nowIso,
            deactivatedBy: 'admin',
            registrationDate: ''
          }
          : {
            reactivatedAt: nowIso,
            reactivatedBy: 'admin',
            registrationDate: nowIso
          })
      };

      await updateDoc(ref, updatedData);

      setNotification({
        show: true,
        message: isDeactivating
          ? `${supervisor.name} deactivated successfully!`
          : `${supervisor.name} reactivated successfully!`,
        type: 'success',
        autoHide: true
      });
    } catch (error) {
      console.error(`Error changing status:`, error);
      setNotification({
        show: true,
        message: 'Failed to update status: ' + error.message,
        type: 'error'
      });
    }
  };

  // 🔹 Table Columns
  const supervisorColumns = [
    {
      key: 'name',
      label: 'Supervisor Details',
      render: (name, item) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{name}</span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${item.status === 'inactive'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
                }`}
            >
              {item.status === 'inactive' ? 'Inactive' : 'Active'}
            </span>
          </div>
          {item.designation && (
            <div className="text-sm text-gray-500 mt-1">
              {item.designation}
            </div>
          )}
        </div>
      )
    },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    {
      key: 'assignedCompany',
      label: 'Assigned Company',
      render: (value) => {
        if (value === 'all' || !value) {
          return (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              All Companies
            </span>
          );
        }
        const company = companies.find((c) => c.id === value);
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            {company ? company.name : 'Unknown Company'}
          </span>
        );
      }
    },
    {
      key: 'password',
      label: 'Password',
      render: (password, item) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm">
            {visiblePasswords.has(item.id) ? password : '••••••••'}
          </span>
          {password && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePasswordVisibility(item.id);
              }}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors duration-200"
              title={
                visiblePasswords.has(item.id)
                  ? 'Hide Password'
                  : 'Show Password'
              }
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewLocation(item);
            }}
            className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transition-all duration-200 shadow-md"
            title="View Location"
          >
            <MapPinIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisplaySupervisor(item);
            }}
            className="p-2 rounded-full bg-green-700 text-white hover:bg-green-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="View Details"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditSupervisor(item);
            }}
            className="p-2 rounded-full bg-blue-700 text-white hover:bg-blue-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="Edit"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSupervisorStatus(item);
            }}
            className={`p-2 rounded-full text-white hover:shadow-lg transition-all duration-200 shadow-md ${item.status === 'inactive'
              ? 'bg-green-700 hover:bg-green-800'
              : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            title={item.status === 'inactive' ? 'Activate' : 'Deactivate'}
          >
            {item.status === 'inactive' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <XCircleIcon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSupervisor(item);
            }}
            className="p-2 rounded-full bg-red-700 text-white hover:bg-red-800 hover:shadow-lg transition-all duration-200 shadow-md"
            title="Delete Permanently"
          >
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supervisor Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your security supervisors and their access
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSupervisor(null);
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 btn-primary flex items-center space-x-2"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Add Supervisor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="Total" value={supervisorStats.total} icon={UsersIcon} color="blue" />
        <StatCard title="Active" value={supervisorStats.active} icon={BuildingOfficeIcon} color="green" />
        <StatCard title="Inactive" value={supervisorStats.inactive} icon={BuildingOfficeIcon} color="red" />
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <DataTable
        data={supervisors}
        columns={supervisorColumns}
        title="Supervisor Directory"
        searchable={true}
        sortable={true}
        pagination={true}
        itemsPerPage={10}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingSupervisor ? 'Edit Supervisor' : 'Add New Supervisor'}
      >
        <AddSupervisorForm
          onAdd={handleAddSupervisor}
          onCancel={handleCancel}
          initialData={editingSupervisor}
        />
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="Supervisor Details"
      >
        {selectedSupervisor && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.name || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.status || 'N/A'}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.city || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">PinCode</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.pincode || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.phone || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.email || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Assigned Company</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedSupervisor.assignedCompany === 'all' || !selectedSupervisor.assignedCompany
                      ? 'All Companies'
                      : companies.find(c => c.id === selectedSupervisor.assignedCompany)?.name || 'Unknown Company'}
                  </p>
                </div>
              </div>
            </div>

            {/* Employment / Registration Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment & Registration Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Salary</p>
                  <p className="text-base font-medium text-gray-900">{selectedSupervisor.salary || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Registration Date</p>
                  <p className="text-base font-medium text-gray-900">{formatDateSafe(selectedSupervisor.registrationDate) || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isLocationModalOpen}
        onClose={handleCloseLocationModal}
        title={`Location Tracking - ${locationSupervisor?.name || ''}`}
        size="large"
      >
        {locationSupervisor && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">{locationSupervisor.name}</h4>
                  <p className="text-sm text-gray-600">{locationSupervisor.email}</p>
                </div>
              </div>
            </div>
            <SupervisorLocationMap
              supervisorEmail={locationSupervisor.email}
              live={true}
            />
          </div>
        )}
      </Modal>

    </div>
  );
}
