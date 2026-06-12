import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const AttendanceReport = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("company");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Search states for dropdowns
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Format YYYY-MM-DD → DD/MM/YYYY for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const getCurrentYear = () => new Date().getFullYear();

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const trimmed = String(timeStr).trim();
    if (!trimmed) return null;

    const parts = trimmed.split(" ");
    let timeComponent = parts[0];
    const period = parts[1]?.toUpperCase() || "";

    if (!timeComponent.includes(":")) {
      timeComponent = `${timeComponent}:00`;
    }

    const [hh = "0", mm = "0"] = timeComponent.split(":");
    let hours = Number(hh);
    const minutes = Number(mm);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const getDurationMinutes = (inTime, outTime) => {
    const start = parseTimeToMinutes(inTime);
    const end = parseTimeToMinutes(outTime);
    if (start == null || end == null) return null;
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const getDurationHoursValue = (inTime, outTime) => {
    const minutes = getDurationMinutes(inTime, outTime);
    if (minutes == null) return null;
    return Number((minutes / 60).toFixed(2));
  };

  const parseFormattedHours = (value) => {
    if (typeof value !== "string") return null;
    const match = value.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      return Number(((hours * 60 + minutes) / 60).toFixed(2));
    }
    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? null : numeric;
  };

  const parseShiftHoursValue = (value) => {
    if (value == null) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  };

  const normalizeCompanyName = (value) => (value || "").toString().trim().toLowerCase();

  const getCompanyShiftHours = (companyName) => {
    if (!companyName) return null;
    const targetName = normalizeCompanyName(companyName);
    const company = companies.find(
      (c) => normalizeCompanyName(c.name || c.companyName) === targetName
    );
    if (!company) return null;
    return (
      parseShiftHoursValue(company.shiftHours) ||
      parseShiftHoursValue(company.shift) ||
      parseShiftHoursValue(company.shiftDuration)
    );
  };

  const getShiftHoursForRecord = (record) => {
    return (
      parseShiftHoursValue(record?.shiftHours) ||
      getCompanyShiftHours(record?.companyName) ||
      8
    );
  };

  const getWorkedHoursValue = (record) => {
    if (!record) return null;
    if (typeof record.hours === "number") return record.hours;
    if (typeof record.workingHours === "number") return record.workingHours;

    if (typeof record.calculatedDay === "number" && record.shiftHours) {
      const shift = parseShiftHoursValue(record.shiftHours);
      if (shift) return Number((record.calculatedDay * shift).toFixed(2));
    }

    const formatted =
      record.workingHoursFormatted || record.hoursFormatted || record.hours;
    const parsedFormatted = parseFormattedHours(formatted);
    if (parsedFormatted != null) return parsedFormatted;

    const durationFromTimes = getDurationHoursValue(record.inTime, record.outTime);
    if (durationFromTimes != null) return durationFromTimes;

    return null;
  };

  const computeDayValue = (record) => {
    const shiftHours = getShiftHoursForRecord(record);
    const workedHours = getWorkedHoursValue(record);
    if (!shiftHours || !workedHours) return 0;

    if (workedHours >= shiftHours) {
      // Full day or overtime
      const overtimeHours = workedHours - shiftHours;

      if (overtimeHours === 0) {
        // Exactly shift hours - full day
        return 1;
      } else {
        // Full day + overtime in decimal format
        // Example: 1 hour OT = 1.01, 1.5 hours OT = 1.015, 2 hours OT = 1.02
        return 1 + (overtimeHours / 100);
      }
    }

    // Partial day - proportional to shift hours
    return Number((workedHours / shiftHours).toFixed(3));
  };

  const calculateHours = (inTime, outTime) => {
    const minutes = getDurationMinutes(inTime, outTime);
    if (minutes == null) return "N/A";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatTotalHours = (hoursValue) => {
    if (!hoursValue) return "0h";
    const totalMinutes = Math.round(hoursValue * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) {
      return `${hrs}h`;
    }
    return `${hrs}h ${mins}m`;
  };

  // Initial load: companies, employees, today's attendance
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCompanies();
      await fetchEmployees();
      await fetchTodaysAttendance();
      setLoading(false);
    };
    load();
  }, []);

  const getTodaysDate = () => new Date().toISOString().split("T")[0];

  // Fetch today's attendance (fallback if query returns empty)
  const fetchTodaysAttendance = async () => {
    setLoading(true);
    const today = getTodaysDate();

    try {
      const q1 = query(collection(db, "attendance"), where("date", "==", today));
      let snap = await getDocs(q1);
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        snap = await getDocs(collection(db, "attendance"));
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((i) => i.date === today);
      }

      list.sort((a, b) => (a.inTime || "").localeCompare(b.inTime || ""));
      setAttendanceData(list);
      setFromDate(today);
      setToDate(today);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const snap = await getDocs(collection(db, "companies"));
      setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching companies:", err);
      setCompanies([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const snap = await getDocs(collection(db, "employees"));
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    }
  };

  // Filter companies based on search term
  useEffect(() => {
    if (companySearchTerm.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const searchTerm = companySearchTerm.toLowerCase().trim();
      const filtered = companies.filter(c => {
        const companyName = c.name || c.companyName || '';
        return companyName.toLowerCase().includes(searchTerm);
      });
      setFilteredCompanies(filtered);
    }
  }, [companySearchTerm, companies]);

  // Filter employees based on search term
  useEffect(() => {
    if (employeeSearchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const searchTerm = employeeSearchTerm.toLowerCase().trim();
      const filtered = employees.filter(emp => {
        const empName = emp.name || emp.employeeName || '';
        return empName.toLowerCase().includes(searchTerm);
      });
      setFilteredEmployees(filtered);
    }
  }, [employeeSearchTerm, employees]);

  // Fetch attendance within fromDate..toDate and by filters
  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "attendance"));
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (fromDate) list = list.filter((i) => i.date >= fromDate);
      if (toDate) list = list.filter((i) => i.date <= toDate);
      if (viewMode === "company" && selectedCompany)
        list = list.filter((i) => i.companyName === selectedCompany);
      if (viewMode === "employee" && selectedEmployee)
        list = list.filter((i) => i.employeeName === selectedEmployee);

      list.sort((a, b) => b.date.localeCompare(a.date));
      setAttendanceData(list);
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedCompany, selectedEmployee, fromDate, toDate]);

  // Auto-fetch when filters change (from/to or view/selection)
  useEffect(() => {
    // Allow fetching if month is selected and dates are set
    const allow = selectedMonth && fromDate && toDate && (
      (viewMode === "company" && (selectedCompany || !selectedCompany)) ||
      (viewMode === "employee" && (selectedEmployee || !selectedEmployee))
    );

    if (allow) {
      fetchAttendanceData();
    } else if (selectedMonth) {
      setAttendanceData([]);
    }
  }, [viewMode, selectedCompany, selectedEmployee, fromDate, toDate, selectedMonth, fetchAttendanceData]);

  // When user selects month (YYYY-MM) set from/to dates automatically
  const handleMonthSelection = (value) => {
    if (!value) {
      setSelectedMonth("");
      return;
    }
    setSelectedMonth(value);
    const [y, m] = value.split("-");
    const first = `${y}-${m}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    setFromDate(first);
    setToDate(last);
  };

  // PDF generation with updated widths (SR=8, NAME=60, DAY=8, TOTAL=15)
  const handleDownloadPDF = () => {
    if (!selectedMonth) {
      alert("Please select a month before downloading the PDF.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");
    const monthNames = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];

    const [year, month] = selectedMonth.split("-");
    const monthName = monthNames[parseInt(month, 10) - 1];
    const daysInMonth = new Date(year, month, 0).getDate();

    const isEmployeeMode = viewMode === "employee" && selectedEmployee;
    const companyText = selectedCompany ? selectedCompany.toUpperCase() : "JMS";
    const primaryHeader = (isEmployeeMode ? selectedEmployee : companyText || "Attendance")?.toUpperCase();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(primaryHeader, 148, 10, { align: "center" });

    let headerBaseline = 10;

    doc.setFontSize(11);
    doc.text(`ATTENDANCE SHEET FOR THE MONTH OF ${monthName} ${year}`, 148, headerBaseline + 7, { align: "center" });

    // Build map employee -> days present
    const empMap = {};
    attendanceData.forEach((r) => {
      const parts = (r.date || "").split("-");
      const d = parts.length === 3 ? parseInt(parts[2], 10) : null;
      if (!d) return;
      const rowLabel = isEmployeeMode ? (r.companyName || "Unassigned Company") : (r.employeeName || "Unknown Employee");
      if (!empMap[rowLabel]) empMap[rowLabel] = {};
      empMap[rowLabel][d] = "P";
    });

    const emps = Object.keys(empMap).sort();

    // Table layout settings
    let cursorY = headerBaseline + 15;
    const srW = 8;
    const nameW = 60;  // Increased from 45 to 60 for better name visibility
    const dayW = 6;
    const totalW = 15;
    const cellH = 6;

    // Header row
    let x = 10;
    doc.setFontSize(7);

    const nameColumnLabel = isEmployeeMode ? "COMPANY NAME" : "SECURITY NAME";
    doc.rect(x, cursorY, srW, cellH); doc.text("SR", x + srW / 2, cursorY + 4, { align: "center" }); x += srW;
    doc.rect(x, cursorY, nameW, cellH); doc.text(nameColumnLabel, x + nameW / 2, cursorY + 4, { align: "center" }); x += nameW;

    for (let d = 1; d <= daysInMonth; d++) {
      doc.rect(x, cursorY, dayW, cellH);
      // For day headers, smaller font if many days
      doc.text(String(d), x + dayW / 2, cursorY + 4, { align: "center" });
      x += dayW;
    }

    doc.rect(x, cursorY, totalW, cellH); doc.text("TOTAL", x + totalW / 2, cursorY + 4, { align: "center" });
    cursorY += cellH;

    // Body rows
    doc.setFont("helvetica", "normal");
    emps.forEach((name, index) => {
      x = 10;
      // SR
      doc.rect(x, cursorY, srW, cellH); doc.text(String(index + 1), x + srW / 2, cursorY + 4, { align: "center" }); x += srW;

      // Name - increased visibility with better font size and width
      doc.rect(x, cursorY, nameW, cellH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);  // Increased from 10 to 8 for consistency
      // Now we can display longer names - increased limit to 40 characters
      const displayName = name.length > 40 ? name.substring(0, 37) + "..." : name;
      doc.text(displayName, x + 2, cursorY + 4); x += nameW;

      // Days
      let total = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        doc.rect(x, cursorY, dayW, cellH);
        if (empMap[name] && empMap[name][d]) {
          doc.text("P", x + dayW / 2, cursorY + 4, { align: "center" });
          total++;
        }
        x += dayW;
      }

      // Total
      doc.rect(x, cursorY, totalW, cellH);
      doc.text(String(total), x + totalW / 2, cursorY + 4, { align: "center" });

      cursorY += cellH;
      // If we reach near bottom of page, add new page and redraw header
      if (cursorY + cellH * 4 > 200) {
        doc.addPage("landscape");
        cursorY = 15;
        // header on new page
        x = 10;
        doc.setFontSize(7);
        doc.rect(x, cursorY, srW, cellH); doc.text("SR", x + srW / 2, cursorY + 4, { align: "center" }); x += srW;
        doc.rect(x, cursorY, nameW, cellH); doc.text(nameColumnLabel, x + nameW / 2, cursorY + 4, { align: "center" }); x += nameW;
        for (let d = 1; d <= daysInMonth; d++) {
          doc.rect(x, cursorY, dayW, cellH);
          doc.text(String(d), x + dayW / 2, cursorY + 4, { align: "center" });
          x += dayW;
        }
        doc.rect(x, cursorY, totalW, cellH); doc.text("TOTAL", x + totalW / 2, cursorY + 4, { align: "center" });
        cursorY += cellH;
        doc.setFont("helvetica", "normal");
      }
    });

    // Footer total row (per day counts and grand total)
    x = 10;
    doc.setFont("helvetica", "bold");
    doc.rect(x, cursorY, srW, cellH); x += srW;
    doc.rect(x, cursorY, nameW, cellH);
    doc.text("TOTAL", x + 2, cursorY + 4); x += nameW;

    let grandTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      let dayCount = 0;
      emps.forEach((n) => {
        if (empMap[n] && empMap[n][d]) dayCount++;
      });
      doc.rect(x, cursorY, dayW, cellH);
      if (dayCount > 0) doc.text(String(dayCount), x + dayW / 2, cursorY + 4, { align: "center" });
      grandTotal += dayCount;
      x += dayW;
    }

    // Final column grand total
    doc.rect(x, cursorY, totalW, cellH);
    doc.text(String(grandTotal), x + totalW / 2, cursorY + 4, { align: "center" });

    // Save file
    const safeLabel = isEmployeeMode
      ? (selectedEmployee ? selectedEmployee.replace(/\s+/g, "_") : "Employee")
      : (selectedCompany ? selectedCompany.replace(/\s+/g, "_") : "JMS");
    doc.save(`Attendance_${safeLabel}_${monthName}_${year}.pdf`);
  };

  const hasSelectedMonth = Boolean(selectedMonth);
  const canShowTable = !loading && attendanceData.length > 0;
  const shouldShowNoData = hasSelectedMonth && !loading && attendanceData.length === 0;

  const daysInSelectedMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split("-");
    if (!year || !month) return null;
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  const totalCalculatedDays = useMemo(() => {
    if (!attendanceData.length) return 0;
    return attendanceData.reduce((sum, record) => sum + computeDayValue(record), 0);
  }, [attendanceData, companies]);

  const dayBreakdownSummary = useMemo(() => {
    if (!attendanceData.length) {
      return {
        totalHours: 0,
        formattedHours: "0h",
        fullDays: 0,
        overtimeDays: 0,
        halfDays: 0,
      };
    }

    let totalHoursValue = 0;
    let fullDays = 0;
    let overtimeDays = 0;
    let halfDays = 0;

    attendanceData.forEach((record) => {
      const worked = getWorkedHoursValue(record);
      if (typeof worked === "number" && !Number.isNaN(worked)) {
        totalHoursValue += worked;
      }

      const dayValue = computeDayValue(record);
      if (dayValue > 1) {
        // Overtime day (has OT hours)
        overtimeDays += 1;
      } else if (dayValue === 1) {
        // Exact full day (no OT)
        fullDays += 1;
      } else if (dayValue > 0 && dayValue < 1) {
        // Partial day
        halfDays += 1;
      }
    });

    return {
      totalHours: totalHoursValue,
      formattedHours: formatTotalHours(totalHoursValue),
      fullDays,
      overtimeDays,
      halfDays,
    };
  }, [attendanceData, companies]);

  const selectedShiftHoursLabel = useMemo(() => {
    if (viewMode !== "company" || !selectedCompany) return null;

    const shiftFromCompany = getCompanyShiftHours(selectedCompany);
    if (shiftFromCompany) {
      return `${shiftFromCompany} hrs`;
    }

    const normalizedTarget = normalizeCompanyName(selectedCompany);
    const recordForCompany = attendanceData.find((record) => {
      if (!record?.companyName) return false;
      return normalizeCompanyName(record.companyName) === normalizedTarget;
    });

    if (recordForCompany) {
      const parsed =
        parseShiftHoursValue(recordForCompany.shiftHours) ||
        getShiftHoursForRecord(recordForCompany);
      if (parsed) {
        return `${parsed} hrs`;
      }
    }

    return "N/A";
  }, [viewMode, selectedCompany, companies, attendanceData]);

  // UI
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Mark Attendance button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Attendance Report</h2>
        <button
          onClick={() => navigate("/mark-attendance")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          Mark Attendance
        </button>
      </div>

      {/* Mode buttons */}
      <div className="flex justify-center gap-3 mb-4">
        <button
          onClick={() => setViewMode("company")}
          className={`px-4 py-2 rounded-md ${viewMode === "company" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Company Wise
        </button>

        <button
          onClick={() => setViewMode("employee")}
          className={`px-4 py-2 rounded-md ${viewMode === "employee" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Employee Wise
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {viewMode === "company" && (
          <div className="relative">
            <label className="block mb-1 text-sm">Select Company</label>
            <input
              type="text"
              value={companySearchTerm}
              onChange={(e) => {
                setCompanySearchTerm(e.target.value);
                setShowCompanyDropdown(true);
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              onDoubleClick={() => setShowCompanyDropdown(false)}
              onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
              placeholder="Search company by name..."
              className="w-full px-3 py-2 border rounded"
            />

            {/* Dropdown suggestions */}
            {showCompanyDropdown && filteredCompanies.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCompanies.map((c) => (
                  <div
                    key={c.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const companyName = c.name || c.companyName;
                      setCompanySearchTerm(companyName);
                      setSelectedCompany(companyName);
                      setShowCompanyDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{c.name || c.companyName}</div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {showCompanyDropdown && companySearchTerm && filteredCompanies.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="px-4 py-3 text-gray-500 text-center">
                  No companies found for "{companySearchTerm}"
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "employee" && (
          <div className="relative">
            <label className="block mb-1 text-sm">Select Employee</label>
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
              className="w-full px-3 py-2 border rounded"
            />

            {/* Dropdown suggestions */}
            {showEmployeeDropdown && filteredEmployees.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const empName = emp.name || emp.employeeName;
                      setEmployeeSearchTerm(empName);
                      setSelectedEmployee(empName);
                      setShowEmployeeDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{emp.name || emp.employeeName}</div>
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
        )}

        {/* From Date */}
        <div>
          <label className="block mb-1 text-sm">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block mb-1 text-sm">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* Month selector */}
        <div>
          <label className="block text-sm mb-1">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthSelection(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Choose Month...</option>
            {Array.from({ length: 12 }).map((_, i) => {
              const m = String(i + 1).padStart(2, "0");
              const y = getCurrentYear();
              return (
                <option key={i} value={`${y}-${m}`}>
                  {new Date(y, i).toLocaleString("default", { month: "long" })} {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-6">
        <button onClick={fetchTodaysAttendance} className="bg-green-600 text-white px-6 py-2 rounded">
          Today's Attendance
        </button>

        <button onClick={handleDownloadPDF} className="bg-blue-600 text-white px-6 py-2 rounded">
          Download PDF
        </button>
      </div>

      {!hasSelectedMonth && (
        <div className="mt-6 text-center text-sm text-gray-600">
          कृपया पूर्ण महिन्यासाठी महिना निवडा, त्यानंतरच डेटा दिसेल.
        </div>
      )}

      {/* Table */}
      {canShowTable && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border bg-white text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Employee</th>
                <th className="border px-3 py-2">Company</th>
                <th className="border px-3 py-2">Shift Hours</th>
                <th className="border px-3 py-2">In Time</th>
                <th className="border px-3 py-2">Out Time</th>
                <th className="border px-3 py-2">Hours</th>
                <th className="border px-3 py-2">Day</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((i, idx) => {
                const checkIn = i.checkInTimeFormatted || i.inTime || "N/A";
                const checkOut = i.checkOutTimeFormatted || i.outTime || "N/A";
                const hours = i.workingHoursFormatted || calculateHours(i.inTime, i.outTime);
                const shiftHours = getShiftHoursForRecord(i);
                const dayValue = computeDayValue(i);
                const formattedDayValue = Number.isInteger(dayValue)
                  ? dayValue.toFixed(0)
                  : dayValue.toFixed(2);
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{formatDate(i.date)}</td>
                    <td className="border px-3 py-2">{i.employeeName}</td>
                    <td className="border px-3 py-2">{i.companyName}</td>
                    <td className="border px-3 py-2 text-center">{shiftHours ? `${shiftHours}h` : "-"}</td>
                    <td className="border px-3 py-2">{checkIn}</td>
                    <td className="border px-3 py-2">{checkOut}</td>
                    <td className="border px-3 py-2">{hours}</td>
                    <td className="border px-3 py-2 text-center">{formattedDayValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bg-white border rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">Total Hours</p>
                <p className="text-lg font-semibold">{dayBreakdownSummary.formattedHours}</p>
                <p className="text-xs text-gray-500">(~ {dayBreakdownSummary.totalHours.toFixed(2)} hrs)</p>
              </div>
              <div
                className={`p-3 bg-gray-50 rounded-md ${daysInSelectedMonth && totalCalculatedDays > daysInSelectedMonth
                  ? "border border-red-400"
                  : ""
                  }`}
              >
                <p className="text-xs text-gray-500">Total Days (Sum)</p>
                <p
                  className={`text-lg font-semibold ${daysInSelectedMonth && totalCalculatedDays > daysInSelectedMonth
                    ? "text-red-600"
                    : ""
                    }`}
                >
                  {totalCalculatedDays.toFixed(2)}
                </p>
                {daysInSelectedMonth && (
                  <p className="text-xs text-gray-500">of {daysInSelectedMonth} days</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">Overtime Days ({'>'}1)</p>
                <p className="text-lg font-semibold">{dayBreakdownSummary.overtimeDays}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">1 Day Entries</p>
                <p className="text-lg font-semibold">{dayBreakdownSummary.fullDays}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">Partial Days ({'<'}1)</p>
                <p className="text-lg font-semibold">{dayBreakdownSummary.halfDays}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
              <span>Total Records: {attendanceData.length}</span>
              <span>Total Hours (Decimal): {dayBreakdownSummary.totalHours.toFixed(2)} hrs</span>
              {viewMode === "company" && selectedCompany && (
                <span>
                  Shift Hours ({selectedCompany}): {selectedShiftHoursLabel || "N/A"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No data */}
      {shouldShowNoData && (
        <div className="text-center mt-6 text-red-600 font-semibold text-lg">No Data Found</div>
      )}
    </div>
  );
};

export default AttendanceReport;
