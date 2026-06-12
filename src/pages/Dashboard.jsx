import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import StatCard from "../components/CardStats/StatCard";
import DataTable from "../components/Table/DataTable";
import AnimatedCounter from "../components/widgets/AnimatedCounter";
import useRealTimeData from "../hooks/useRealTimeData";
import { useNavigate } from "react-router-dom";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  BriefcaseIcon
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

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
    <div className="px-6 py-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview of your workforce, daily attendance, and operations</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 font-medium">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live Updates Active</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <BuildingOfficeIcon className="h-5 w-5 text-blue-500" />
          <span>Quick Actions</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/mark-attendance')}
            className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
          >
            <CheckCircleIcon className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-gray-800">Mark Attendance</span>
          </button>
          <button
            onClick={() => navigate('/salary-billing')}
            className="p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
          >
            <DocumentTextIcon className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-gray-800">Salary Billing</span>
          </button>
          <button
            onClick={() => navigate('/advance-management')}
            className="p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
          >
            <BanknotesIcon className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-gray-800">Give Advance</span>
          </button>
          <button
            onClick={() => navigate('/issue-items')}
            className="p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer group"
          >
            <BriefcaseIcon className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-gray-800">Issue Items</span>
          </button>
        </div>
      </div>

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

      {/* Default view when no summary is selected */}
      {!selectedSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              Recent Attendance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 rounded-l-md font-semibold">Employee</th>
                    <th className="px-4 py-2 text-center rounded-r-md font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.slice(0, 5).map((rec, idx) => (
                    <tr key={rec.id || idx} className="border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{rec.employeeName || rec.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                          Present
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendanceData.length === 0 && (
                    <tr>
                      <td colSpan="2" className="px-4 py-6 text-center text-gray-500">No attendance records for today</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {attendanceData.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => setSelectedSummary('present')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  View All Present ({headerAttendanceStats.presentCount})
                </button>
              </div>
            )}
          </div>

          {/* Recent Companies / Active Overview */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-500 mr-2" />
              Active Companies Overview
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 rounded-l-md font-semibold">Company</th>
                    <th className="px-4 py-2 text-right rounded-r-md font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompanies.slice(0, 5).map((comp, idx) => (
                    <tr key={comp.id || idx} className="border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{comp.name}</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">{comp.location || comp["company location"] || "Not specified"}</td>
                    </tr>
                  ))}
                  {recentCompanies.length === 0 && (
                    <tr>
                      <td colSpan="2" className="px-4 py-6 text-center text-gray-500">No active companies found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {recentCompanies.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => setSelectedSummary('companies')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  View All Companies ({companies.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
