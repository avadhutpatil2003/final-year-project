import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CalendarIcon, 
  TrashIcon,
  PencilIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Modal from '../components/Modal/Modal';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newManualEmployee, setNewManualEmployee] = useState('');
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    workingHours: '',
    location: '',
    selectedEmployees: [],
    paymentStatus: 'pending',
    manualEmployees: []
  });

  // Helper: Reindex eventNo so they are continuous (1,2,3,...) after any delete
  const reindexEvents = async () => {
    try {
      const eventsRef = collection(db, 'events');

      // Use createdAt (or fallback to eventDate) to keep a stable order for numbering
      let q;
      try {
        q = query(eventsRef, orderBy('createdAt', 'asc'));
      } catch (error) {
        try {
          q = query(eventsRef, orderBy('eventDate', 'asc'));
        } catch (fallbackError) {
          q = eventsRef;
        }
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setEvents([]);
        return;
      }

      const batch = writeBatch(db);
      let counter = 1;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const desiredNo = counter;

        if (data.eventNo !== desiredNo) {
          batch.update(docSnap.ref, { eventNo: desiredNo });
        }

        counter += 1;
      });

      // Only commit if there were docs
      await batch.commit();

      // Refresh local state
      fetchEvents();
    } catch (error) {
      console.error('Error reindexing events:', error);
    }
  };

  // Fetch events and employees from Firebase
  useEffect(() => {
    fetchEvents();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const eventsRef = collection(db, 'events');
      const snapshot = await getDocs(eventsRef);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date (newest first)
      eventsData.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      if (name === 'startTime' || name === 'endTime') {
        updated.workingHours = calculateWorkingHours(
          name === 'startTime' ? value : updated.startTime,
          name === 'endTime' ? value : updated.endTime
        );
      }

      return updated;
    });
  };

  const calculateWorkingHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    let diff = (end - start) / (1000 * 60 * 60);
    if (isNaN(diff)) return '';
    if (diff < 0) diff += 24; // handle overnight events
    return diff.toFixed(2);
  };

  const handleEmployeeToggle = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const manualEmployeesForSave = (formData.manualEmployees || [])
        .filter(emp => emp.isSelected !== false)
        .map(({ id, name }) => ({ id, name }));

      // Require at least one employee (selected or manual) before saving
      const hasSelectedEmployees = (formData.selectedEmployees || []).length > 0;
      const hasManualEmployees = manualEmployeesForSave.length > 0;

      if (!hasSelectedEmployees && !hasManualEmployees) {
        alert('किमान एक employee निवडल्याशिवाय event add / update करू शकत नाही.');
        return;
      }

      const payload = {
        ...formData,
        workingHours: formData.workingHours || calculateWorkingHours(formData.startTime, formData.endTime),
        manualEmployees: manualEmployeesForSave
      };

      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
        alert('✅ Event updated successfully!');
      } else {
        // Add new event
        // Determine next eventNo (sequential)
        const eventsRef = collection(db, 'events');
        const existingSnap = await getDocs(eventsRef);
        const nextEventNo = existingSnap.size + 1;

        // Use eventName as document ID so it appears as e.g. "BDay" in Firestore
        const trimmedName = (formData.eventName || '').trim();
        if (!trimmedName) {
          alert('Event Name is required.');
          return;
        }

        const eventDocRef = doc(eventsRef, trimmedName);
        await setDoc(eventDocRef, {
          ...payload,
          createdAt: new Date().toISOString(),
          eventNo: nextEventNo
        });
        alert('✅ Event added successfully!');
      }
      
      // Reset form
      setFormData({
        eventName: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        workingHours: '',
        location: '',
        selectedEmployees: [],
        paymentStatus: 'pending',
        manualEmployees: []
      });
      setEditingEvent(null);
      setNewManualEmployee('');
      
      // Refresh events list
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('❌ Error saving event: ' + error.message);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      eventName: event.eventName,
      eventDate: event.eventDate,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      workingHours: event.workingHours || '',
      location: event.location,
      selectedEmployees: event.selectedEmployees || [],
      paymentStatus: event.paymentStatus || 'pending',
      manualEmployees: (event.manualEmployees || []).map(emp => ({
        ...emp,
        isSelected: true
      }))
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        alert('✅ Event deleted successfully!');
        // After delete, reindex eventNo so there are no gaps
        await reindexEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('❌ Error deleting event');
      }
    }
  };

  const handleCancel = () => {
    setEditingEvent(null);
    setFormData({
      eventName: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      workingHours: '',
      location: '',
      selectedEmployees: [],
      paymentStatus: 'pending',
      manualEmployees: []
    });
    setNewManualEmployee('');
  };

  const handleAddManualEmployee = () => {
    const trimmedName = newManualEmployee.trim();
    if (!trimmedName) return;

    setFormData(prev => ({
      ...prev,
      manualEmployees: [
        ...(prev.manualEmployees || []),
        {
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: trimmedName,
          isSelected: true
        }
      ]
    }));
    setNewManualEmployee('');
  };

  const handleRemoveManualEmployee = (manualId) => {
    setFormData(prev => ({
      ...prev,
      manualEmployees: (prev.manualEmployees || []).filter(manual => manual.id !== manualId)
    }));
  };

  const handleManualSelectionToggle = (manualId) => {
    setFormData(prev => ({
      ...prev,
      manualEmployees: (prev.manualEmployees || []).map(manual =>
        manual.id === manualId ? { ...manual, isSelected: manual.isSelected === false ? true : false } : manual
      )
    }));
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || employeeId;
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const openEventDetails = (event) => {
    setSelectedEventDetails(event);
    setIsDetailsModalOpen(true);
  };

  const closeEventDetails = () => {
    setSelectedEventDetails(null);
    setIsDetailsModalOpen(false);
  };

  const handlePaymentToggle = async (eventId, currentStatus) => {
    // Only allow Pending → Paid, not Paid → Pending
    if (currentStatus === 'paid') {
      alert('⚠️ Payment already marked as paid. Cannot change back to pending.');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'events', eventId), {
        paymentStatus: 'paid',
        paidAt: new Date().toISOString() // Record when payment was marked as paid
      });
      fetchEvents();
      alert('✅ Payment marked as paid!');
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('❌ Error updating payment status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-orange-600';
      case 'not_required':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
        <p className="text-gray-600 mt-1">Manage company events and activities</p>
      </div>

      {/* Add/Edit Event Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingEvent ? 'Edit Event' : 'Add New Event'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., BDay, College Function, Politics Meeting"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Company Garden, Sangli"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Working Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Hours
              </label>
              <input
                type="text"
                name="workingHours"
                value={formData.workingHours}
                onChange={handleChange}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                placeholder="Auto-calculated"
              />
              {formData.startTime && formData.endTime && (
                <p className="text-xs text-gray-500 mt-1">
                  From {formData.startTime} to {formData.endTime} = {formData.workingHours || calculateWorkingHours(formData.startTime, formData.endTime)} hrs
                </p>
              )}
            </div>

          </div>

          {/* Employee Assignment Section */}
          <div className="space-y-4">
            {/* Top row: Add Employee and Search in 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
              {/* Add Employee */}
              <div className="space-y-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add Employee
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={newManualEmployee}
                      onChange={(e) => setNewManualEmployee(e.target.value)}
                      placeholder="Enter employee name"
                      className="w-full lg:max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualEmployee}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                      disabled={!newManualEmployee.trim()}
                    >
                      Add Manual Employee
                    </button>
                  </div>
                </div>

                {formData.manualEmployees?.length > 0 && (
                  <div className="space-y-2">
                    {formData.manualEmployees.map((manual) => (
                      <div
                        key={manual.id}
                        className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 bg-white"
                      >
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                            checked={manual.isSelected !== false}
                            onChange={() => handleManualSelectionToggle(manual.id)}
                          />
                          <span>{manual.name}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveManualEmployee(manual.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Employees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Search Employee
                </label>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employees by name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Full-width Employee Box */}
            <div className="border border-gray-300 rounded-md p-3 max-h-56 overflow-y-auto bg-gray-50">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No employees found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.selectedEmployees.includes(emp.id)}
                        onChange={() => handleEmployeeToggle(emp.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{emp.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected: {formData.selectedEmployees.length} employee(s)
            </p>
          </div>

          {/* Form Buttons */}
          <div className="flex space-x-3 pt-4">
            {editingEvent && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingEvent ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Events</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600">Create your first event using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map(event => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openEventDetails(event)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{event.eventName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {new Date(event.eventDate).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {event.location}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {event.workingHours ? `${event.workingHours} hrs` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentToggle(event.id, event.paymentStatus || 'pending');
                          }}
                          disabled={(event.paymentStatus || 'pending') === 'paid'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            (event.paymentStatus || 'pending') === 'paid' 
                              ? 'bg-green-600 cursor-not-allowed opacity-75' 
                              : 'bg-gray-300 cursor-pointer hover:bg-gray-400'
                          }`}
                          title={(event.paymentStatus || 'pending') === 'paid' ? 'Already paid' : 'Click to mark as paid'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              (event.paymentStatus || 'pending') === 'paid' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`ml-2 text-sm font-medium ${
                          (event.paymentStatus || 'pending') === 'paid' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {(event.paymentStatus || 'pending') === 'paid' ? '✓ Paid' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this event permanently?')) {
                            handleDelete(event.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen && Boolean(selectedEventDetails)}
        onClose={closeEventDetails}
        title={selectedEventDetails ? `${selectedEventDetails.eventName || 'Event'} – Details` : 'Event Details'}
        size="large"
      >
        {selectedEventDetails && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Date</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedEventDetails.eventDate
                    ? new Date(selectedEventDetails.eventDate).toLocaleDateString('en-IN')
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Timing</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <ClockIcon className="h-4 w-4" />
                  {selectedEventDetails.startTime || 'N/A'} – {selectedEventDetails.endTime || 'N/A'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Total: {selectedEventDetails.workingHours ? `${selectedEventDetails.workingHours} hrs` : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Payment Status</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      (selectedEventDetails.paymentStatus || 'pending') === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {(selectedEventDetails.paymentStatus || 'pending') === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                  {selectedEventDetails.paidAt && (
                    <span className="text-xs text-gray-500">
                      on {new Date(selectedEventDetails.paidAt).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <UsersIcon className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">Assigned Employees</h4>
              </div>

              {(() => {
                const dbEmployees = (selectedEventDetails.selectedEmployees || []).map((id) => ({
                  id,
                  name: getEmployeeName(id)
                }));
                const manualEmployees = (selectedEventDetails.manualEmployees || []).map((emp) => ({
                  id: emp.id,
                  name: emp.name
                }));
                const combinedEmployees = [...dbEmployees, ...manualEmployees].filter(emp => emp.name);

                if (!combinedEmployees.length) {
                  return <p className="mt-4 text-sm text-gray-500">No employees assigned.</p>;
                }

                return (
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {combinedEmployees.map((emp) => (
                      <span
                        key={emp.id}
                        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        {emp.name}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPinIcon className="h-5 w-5 text-rose-600" />
                <h4 className="font-semibold">Location</h4>
              </div>
              <p className="mt-3 text-sm text-gray-700 capitalize">
                {selectedEventDetails.location || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
