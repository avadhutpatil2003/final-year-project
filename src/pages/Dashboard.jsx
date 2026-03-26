import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import StatCard from "../components/CardStats/StatCard";
import DataTable from "../components/Table/DataTable";
import AnimatedCounter from "../components/widgets/AnimatedCounter";
import useRealTimeData from "../hooks/useRealTimeData";
import SupervisorLocationMap from "../components/SupervisorLocationMap";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Memoize initial data to prevent infinite re-renders
  const initialStatsData = useMemo(() => ({
    totalCompanies: companies.length,
    activeCompanies: companies.filter((c) => c.status === "on_duty").length,
    totalEmployees: employees.length,
    presentEmployees: employees.filter((e) => e.status === "present").length,
    absentEmployees: employees.filter((e) => e.status === "absent").length,
    totalShifts: 156,
    completedShifts: 142,
    attendanceRate:
      employees.length > 0
        ? (
            (employees.filter((e) => e.status === "present").length /
              employees.length) *
            100
          ).toFixed(1)
        : 0,
    incidentReports: 3,
    stockAlerts: 2,
    monthlyHours: 3240,
  }), [companies, employees]);

  // Real-time data hooks (keeping for other stats)
  const {
    data: stats,
  } = useRealTimeData(initialStatsData, 5000);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch employees with real-time updates
        const employeesRef = collection(db, "employees");
        console.log('🔄 Setting up employee listener for dashboard...');
        
        // Try with ordering first, fallback to no ordering if it fails
        let employeesQuery;
        try {
          employeesQuery = query(employeesRef, orderBy("createdAt", "desc"));
        } catch (error) {
          console.warn('⚠️ Employee ordering failed, using collection without ordering:', error);
          employeesQuery = employeesRef;
        }

        const unsubscribeEmployees = onSnapshot(
          employeesQuery,
          (querySnapshot) => {
            console.log('📊 Dashboard - Employee query snapshot received:', querySnapshot.size, 'documents');
            const employeeData = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              // Ensure proper employee data structure
              const formattedEmployee = {
                id: doc.id,
                name: data.name || 'Unknown Employee',
                status: data.status || 'on_duty',
                role: data.role || 'Security Guard',
                ...data
              };
              employeeData.push(formattedEmployee);
            });
            
            console.log('✅ Dashboard - Total employees loaded:', employeeData.length);
            console.log('📋 Dashboard - Employee data:', employeeData.map(emp => ({ id: emp.id, name: emp.name, status: emp.status })));
            setEmployees(employeeData);
          },
          (error) => {
            console.error('❌ Dashboard - Error fetching employees:', error);
            
            // Fallback: Try without any query constraints
            console.log('🔄 Dashboard - Trying fallback employee query...');
            const fallbackUnsubscribe = onSnapshot(
              employeesRef,
              (querySnapshot) => {
                console.log('📊 Dashboard Fallback - Employee snapshot received:', querySnapshot.size, 'documents');
                const employeeData = [];
                querySnapshot.forEach((doc) => {
                  const data = doc.data();
                  const formattedEmployee = {
                    id: doc.id,
                    name: data.name || 'Unknown Employee',
                    status: data.status || 'on_duty',
                    role: data.role || 'Security Guard',
                    ...data
                  };
                  employeeData.push(formattedEmployee);
                });
                
                console.log('✅ Dashboard Fallback - Total employees loaded:', employeeData.length);
                setEmployees(employeeData);
              },
              (fallbackError) => {
                console.error('❌ Dashboard - Fallback employee query also failed:', fallbackError);
              }
            );
            
            return fallbackUnsubscribe;
          }
        );

        // Fetch companies
        const companiesRef = collection(db, "companies");
        const companiesQuery = query(
          companiesRef,
          orderBy("createdAt", "desc")
        );
        const unsubscribeCompanies = onSnapshot(
          companiesQuery,
          (querySnapshot) => {
            const companyData = [];
            querySnapshot.forEach((doc) => {
              companyData.push({ id: doc.id, ...doc.data() });
            });
            setCompanies(companyData);
            // Filter active companies for display
            const activeCompanies = companyData.filter(company => 
              company.status === 'active' || company.status === 'on_duty' || !company.status
            );
            setRecentCompanies(activeCompanies.slice(0, 8));
          }
        );

        // Fetch supervisors
        const supervisorsRef = collection(db, "supervisors");
        const supervisorsQuery = query(
          supervisorsRef,
          orderBy("createdAt", "desc")
        );
        const unsubscribeSupervisors = onSnapshot(
          supervisorsQuery,
          (querySnapshot) => {
            const supervisorData = [];
            querySnapshot.forEach((doc) => {
              supervisorData.push({ id: doc.id, ...doc.data() });
            });
            setSupervisors(supervisorData);
          }
        );

        // Fetch attendance data with real-time updates
        const attendanceRef = collection(db, "attendance");
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log('🔄 Setting up attendance listener for date:', todayStr);
        
        let attendanceQuery;
        try {
          attendanceQuery = query(
            attendanceRef,
            orderBy("date", "desc")
          );
        } catch (orderError) {
          console.warn('⚠️ Attendance orderBy query failed, using collection without ordering:', orderError);
          attendanceQuery = attendanceRef;
        }
        
        const unsubscribeAttendance = onSnapshot(
          attendanceQuery,
          (querySnapshot) => {
            console.log('📊 Attendance query snapshot received:', querySnapshot.size, 'documents');
            const attendanceList = [];
            const allAttendanceData = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              allAttendanceData.push({ id: doc.id, ...data });
              
              // Filter today's attendance
              if (data.date && data.date.toDate) {
                const attendanceDate = data.date.toDate().toISOString().split('T')[0];
                if (attendanceDate === todayStr) {
                  // Format the attendance record with employee name
                  const formattedRecord = {
                    id: doc.id,
                    ...data,
                    employeeName: data.employeeName || data.name || 'Unknown Employee',
                    checkInTime: data.checkIn ? data.checkIn.toDate().toLocaleTimeString() : null,
                    checkOutTime: data.checkOut ? data.checkOut.toDate().toLocaleTimeString() : null,
                    status: data.status || 'present'
                  };
                  attendanceList.push(formattedRecord);
                }
              } else if (data.date && typeof data.date === 'string') {
                // Handle string dates
                if (data.date === todayStr) {
                  const formattedRecord = {
                    id: doc.id,
                    ...data,
                    employeeName: data.employeeName || data.name || 'Unknown Employee',
                    checkInTime: data.checkIn || null,
                    checkOutTime: data.checkOut || null,
                    status: data.status || 'present'
                  };
                  attendanceList.push(formattedRecord);
                }
              }
            });
            
            console.log('✅ Today\'s attendance records:', attendanceList.length);
            console.log('📋 Attendance data:', attendanceList);
            setAttendanceData(attendanceList);
          },
          (error) => {
            console.error('❌ Error fetching attendance data:', error);
          }
        );

        return () => {
          unsubscribeEmployees();
          unsubscribeCompanies();
          unsubscribeSupervisors();
          unsubscribeAttendance();
        };
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchInitialData();
    setLoading(false);
  }, []);

  // Update timestamp when data changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [stats]);

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    const presentEmployees = attendanceData.filter(record => 
      record.status === 'present' || record.checkIn
    );
    const absentEmployees = employees.filter(emp => 
      !attendanceData.some(record => 
        (record.employeeId === emp.id || record.employeeName === emp.name) && 
        (record.status === 'present' || record.checkIn)
      )
    );
    
    return {
      present: presentEmployees,
      absent: absentEmployees,
      totalEmployees: employees.length,
      presentCount: presentEmployees.length,
      absentCount: absentEmployees.length
    };
  };

  const headerAttendanceStats = getAttendanceStats();

  const companyColumns = [
    {
      key: "name",
      label: "Company Name",
      render: (name, item) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{item.companyType }</div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (location, item) => (
        <div>
          <div className="text-sm">{location || item["company location"] }</div>
          <div className="text-xs text-gray-500">{item.address || ""}</div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Header with Live Controls */}

      {/* Stats Cards Row: Total Companies, Total Employees, Present, Absent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={<AnimatedCounter value={companies.length} />}
          changeType="increase"
          icon={BuildingOfficeIcon}
          color="blue"
          className="shadow-lg shadow-blue-500/40"
          onClick={() => setSelectedSummary('companies')}
          onDoubleClick={() => setSelectedSummary(null)}
        />
        <StatCard
          title="Total Employees"
          value={<AnimatedCounter value={employees.length} />}
          changeType="increase"
          icon={UserGroupIcon}
          color="orange"
          className="shadow-lg shadow-orange-500/40"
          onClick={() => setSelectedSummary('employees')}
          onDoubleClick={() => setSelectedSummary(null)}
        />
        <StatCard
          title="Present"
          value={<AnimatedCounter value={headerAttendanceStats.presentCount} />}
          changeType="increase"
          icon={CheckCircleIcon}
          color="green"
          className="shadow-lg shadow-green-500/40"
          onClick={() => setSelectedSummary('present')}
          onDoubleClick={() => setSelectedSummary(null)}
        />
        <StatCard
          title="Absent"
          value={<AnimatedCounter value={headerAttendanceStats.absentCount} />}
          changeType="decrease"
          icon={XCircleIcon}
          color="red"
          className="shadow-lg shadow-red-500/40"
          onClick={() => setSelectedSummary('absent')}
          onDoubleClick={() => setSelectedSummary(null)}
        />
      </div>

      {/* Summary Detail Section based on selected card */}
      {selectedSummary === 'companies' && (
        <div className="card p-4">
          <DataTable
            data={companies}
            columns={companyColumns}
            title={`All Companies (${companies.length})`}
            searchable={true}
            pagination={true}
            itemsPerPage={10}
          />
        </div>
      )}

      {selectedSummary === 'employees' && (
        <div className="card p-4">
          <DataTable
            data={employees}
            columns={[
              {
                key: 'name',
                label: 'Employee Name',
              },
              {
                key: 'address',
                label: 'Address',
              },
              {
                key: 'phone',
                label: 'Contact',
              },
              {
                key: 'nomineeContact',
                label: 'Nominal Contact',
              },
            ]}
            title={`All Employees (${employees.length})`}
            searchable={true}
            pagination={true}
            itemsPerPage={10}
          />
        </div>
      )}

      {selectedSummary === 'present' && (
        <div className="card p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Today's Present Employees</h3>
          <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
            {headerAttendanceStats.present.map((rec, idx) => (
              <div key={rec.id || idx} className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
                <span className="font-medium text-gray-900">{rec.employeeName || rec.name || 'Unknown'}</span>
                <span className="text-xs text-green-600">Present</span>
              </div>
            ))}
            {headerAttendanceStats.presentCount === 0 && (
              <div className="text-xs text-gray-500">No present employees found for today.</div>
            )}
          </div>
        </div>
      )}

      {selectedSummary === 'absent' && (
        <div className="card p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Today's Absent Employees</h3>
          <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
            {headerAttendanceStats.absent.map((emp, idx) => (
              <div key={emp.id || idx} className="flex items-center justify-between p-2 bg-red-50 rounded-md border border-red-200">
                <span className="font-medium text-gray-900">{emp.name || 'Unknown'}</span>
                <span className="text-xs text-red-600">Absent</span>
              </div>
            ))}
            {headerAttendanceStats.absentCount === 0 && (
              <div className="text-xs text-gray-500">No absent employees found for today.</div>
            )}
          </div>
        </div>
      )}

        {/* Supervisor Location Tracking with Map */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-5 w-5 text-blue-500" />
              <span>Supervisor Location Tracking</span>
            </div>
            <span className="text-xs text-gray-500">Live tracking with date-wise history</span>
          </h3>
          
          <div className="space-y-4">
            {/* Supervisor Selector */}
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Supervisor</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 -mt-2">Select a supervisor to load live pins. The map remains visible for quick context.</p>

            {/* Map Component */}
            <SupervisorLocationMap
              supervisorEmail={
                supervisors.find((s) => s.id === selectedSupervisor)?.email || selectedSupervisor || ""
              }
            />
          </div>
        </div>

    </div>
  );
};

export default Dashboard;
