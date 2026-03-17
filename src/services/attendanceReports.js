import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

/**
 * Attendance Reports Service
 * Manages attendance_reports collection in Firestore
 */

// Create new attendance report
export const createAttendanceReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, "attendance_reports"), {
      ...reportData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log("✅ Attendance report created with ID:", docRef.id);
    return { id: docRef.id, ...reportData };
  } catch (error) {
    console.error("❌ Error creating attendance report:", error);
    throw error;
  }
};

// Get all attendance reports
export const getAllAttendanceReports = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "attendance_reports"));
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Retrieved ${reports.length} attendance reports`);
    return reports;
  } catch (error) {
    console.error("❌ Error fetching attendance reports:", error);
    throw error;
  }
};

// Get attendance report by ID
export const getAttendanceReportById = async (reportId) => {
  try {
    const docRef = doc(db, "attendance_reports", reportId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No attendance report found with ID:", reportId);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching attendance report:", error);
    throw error;
  }
};

// Get reports by employee ID
export const getReportsByEmployeeId = async (employeeId) => {
  try {
    const q = query(
      collection(db, "attendance_reports"),
      where("employeeId", "==", employeeId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${reports.length} reports for employee ${employeeId}`);
    return reports;
  } catch (error) {
    console.error("❌ Error fetching employee reports:", error);
    // Fallback: get all reports and filter client-side
    const allReports = await getAllAttendanceReports();
    return allReports.filter(report => report.employeeId === employeeId);
  }
};

// Get reports by month and year
export const getReportsByMonth = async (month, year) => {
  try {
    const q = query(
      collection(db, "attendance_reports"),
      where("month", "==", parseInt(month)),
      where("year", "==", parseInt(year))
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${reports.length} reports for ${month}/${year}`);
    return reports;
  } catch (error) {
    console.error("❌ Error fetching monthly reports:", error);
    // Fallback: get all reports and filter client-side
    const allReports = await getAllAttendanceReports();
    return allReports.filter(report => 
      report.month === parseInt(month) && report.year === parseInt(year)
    );
  }
};

// Update attendance report
export const updateAttendanceReport = async (reportId, updateData) => {
  try {
    const docRef = doc(db, "attendance_reports", reportId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date()
    });
    
    console.log("✅ Attendance report updated:", reportId);
    return true;
  } catch (error) {
    console.error("❌ Error updating attendance report:", error);
    throw error;
  }
};

// Delete attendance report
export const deleteAttendanceReport = async (reportId) => {
  try {
    await deleteDoc(doc(db, "attendance_reports", reportId));
    console.log("✅ Attendance report deleted:", reportId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting attendance report:", error);
    throw error;
  }
};

// Generate monthly attendance report for employee
export const generateMonthlyReport = async (employeeData, attendanceRecords, month, year) => {
  try {
    // Calculate statistics
    let presentDays = 0;
    let totalWorkingHours = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let overtimeHours = 0;

    const processedRecords = attendanceRecords.map(record => {
      const workingHours = calculateWorkingHours(record.inTime || record.checkInTime, record.outTime || record.checkOutTime);
      
      if (record.status === "present" || record.status === "on_duty") {
        presentDays++;
        totalWorkingHours += workingHours;
        
        if (workingHours > 8) {
          overtimeHours += (workingHours - 8);
        }
        
        // Check for late arrival (after 9:30 AM)
        if (record.inTime && isLateArrival(record.inTime)) {
          lateArrivals++;
        }
        
        // Check for early departure (before 5:30 PM)
        if (record.outTime && isEarlyDeparture(record.outTime)) {
          earlyDepartures++;
        }
      }

      return {
        date: record.date,
        status: record.status,
        checkInTime: record.inTime || record.checkInTime || "",
        checkOutTime: record.outTime || record.checkOutTime || "",
        workingHours: workingHours,
        location: record.location || "",
        notes: record.notes || ""
      };
    });

    const totalWorkingDays = getDaysInMonth(year, month);
    const absentDays = totalWorkingDays - presentDays;
    const attendancePercentage = ((presentDays / totalWorkingDays) * 100).toFixed(2);
    const averageHoursPerDay = presentDays > 0 ? (totalWorkingHours / presentDays).toFixed(2) : 0;

    // Calculate performance rating
    let performanceRating = "Poor";
    const attendanceScore = parseFloat(attendancePercentage);
    const punctualityScore = presentDays > 0 ? ((presentDays - lateArrivals) / presentDays) * 100 : 0;

    if (attendanceScore >= 95 && punctualityScore >= 90) performanceRating = "Excellent";
    else if (attendanceScore >= 90 && punctualityScore >= 85) performanceRating = "Very Good";
    else if (attendanceScore >= 85 && punctualityScore >= 80) performanceRating = "Good";
    else if (attendanceScore >= 80 && punctualityScore >= 75) performanceRating = "Satisfactory";
    else if (attendanceScore >= 70) performanceRating = "Needs Improvement";

    const reportData = {
      // Employee Information
      employeeId: employeeData.id,
      employeeName: employeeData.name,
      employeeEmail: employeeData.email || "",
      employeePhone: employeeData.phone || "",
      employeeDepartment: employeeData.department || "",
      employeePosition: employeeData.position || "",
      
      // Period Information
      month: parseInt(month),
      year: parseInt(year),
      monthName: getMonthName(month),
      
      // Attendance Statistics
      totalWorkingDays,
      presentDays,
      absentDays,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      averageHoursPerDay: parseFloat(averageHoursPerDay),
      attendancePercentage: parseFloat(attendancePercentage),
      
      // Performance Metrics
      lateArrivals,
      earlyDepartures,
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      punctualityPercentage: parseFloat(punctualityScore.toFixed(2)),
      performanceRating,
      
      // Detailed Records
      attendanceRecords: processedRecords,
      
      // Metadata
      reportId: `${employeeData.id}_${year}_${String(month).padStart(2, '0')}`,
      generatedAt: new Date().toISOString()
    };

    // Save to Firestore
    const result = await createAttendanceReport(reportData);
    console.log(`✅ Monthly report generated for ${employeeData.name} - ${getMonthName(month)} ${year}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Error generating monthly report:`, error);
    throw error;
  }
};

// Helper Functions
const getMonthName = (monthNumber) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[parseInt(monthNumber) - 1] || monthNumber;
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const calculateWorkingHours = (inTime, outTime) => {
  if (!inTime || !outTime) return 0;
  
  try {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours + (minutes / 60);
    };
    
    const inHours = parseTime(inTime);
    let outHours = parseTime(outTime);
    
    // Handle next day scenario
    if (outHours < inHours) {
      outHours += 24;
    }
    
    return Math.max(0, outHours - inHours);
  } catch (error) {
    return 0;
  }
};

const isLateArrival = (checkInTime) => {
  try {
    const [time, period] = checkInTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const checkInMinutes = hours * 60 + minutes;
    const lateThreshold = 9 * 60 + 30; // 9:30 AM
    
    return checkInMinutes > lateThreshold;
  } catch (error) {
    return false;
  }
};

const isEarlyDeparture = (checkOutTime) => {
  try {
    const [time, period] = checkOutTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const checkOutMinutes = hours * 60 + minutes;
    const earlyThreshold = 17 * 60 + 30; // 5:30 PM
    
    return checkOutMinutes < earlyThreshold;
  } catch (error) {
    return false;
  }
};

// Bulk operations
export const createMultipleReports = async (reportsData) => {
  try {
    const results = [];
    for (const reportData of reportsData) {
      const result = await createAttendanceReport(reportData);
      results.push(result);
    }
    
    console.log(`✅ Created ${results.length} attendance reports`);
    return results;
  } catch (error) {
    console.error("❌ Error creating multiple reports:", error);
    throw error;
  }
};

// Search reports
export const searchReports = async (searchTerm) => {
  try {
    const allReports = await getAllAttendanceReports();
    
    const filteredReports = allReports.filter(report => 
      report.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.monthName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.performanceRating?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log(`🔍 Found ${filteredReports.length} reports matching "${searchTerm}"`);
    return filteredReports;
  } catch (error) {
    console.error("❌ Error searching reports:", error);
    throw error;
  }
};
