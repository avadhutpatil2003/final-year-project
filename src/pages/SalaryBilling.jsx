import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdvance } from "../contexts/AdvanceContext";
import {
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  PencilIcon
} from "@heroicons/react/24/outline";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "firebase/firestore";
import { format, getDaysInMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

import { getCompanyOptions, getCompanyById } from "../data/companyData";
import { createDeductionNotifications } from "../utils/notificationService";
import Toast from "../components/Toast";


// Number to words conversion function
const convertNumberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertHundreds = (n) => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };

  let result = '';
  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
    num %= 10000000;
  }

  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
    num %= 100000;
  }

  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    result += convertHundreds(thousands) + 'Thousand ';
    num %= 1000;
  }

  if (num > 0) {
    result += convertHundreds(num);
  }

  return result.trim();
};

const SalaryBilling = () => {
  const navigate = useNavigate();
  const { clearAdvanceData } = useAdvance();
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    companyId: "", // Add company selection
    month: format(new Date(), "MM"),
    year: format(new Date(), "yyyy"),
    // Earnings - Will be calculated automatically
    basicSalary: "",
    hourlyRate: "",
    totalWorkingHours: "",
    calculatedSalary: "",
    bonus: "0",
    incentives: "0",
    // Deductions
    advanceDeduction: "0",
    epfo: "0",
    esic: "0",
    uniform: "0",
    shoes: "0",
    other: "0",
    notes: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    // Billing data from BillingPage
    billingBreakdown: [],
    totalBillingSalary: "0",
    // Advance tracking data
    originalAdvanceAmount: "0",
    previousAdvanceDeductions: "0",
    remainingAdvanceAmount: "0",
    // Shoes tracking data
    previousShoesDeductions: "0",
    remainingShoesAmount: "0",
    // Uniform tracking data
    previousUniformDeductions: "0",
    remainingUniformAmount: "0",
    // EPFO and ESIC tracking
    totalEpfoDeductions: "0",
    totalEsicDeductions: "0",
    paymentMethod: "bank_transfer",
    status: "",
  });

  const currencyFields = useMemo(
    () => (
      new Set([
        'basicSalary',
        'bonus',
        'incentives',
        'advanceDeduction',
        'epfo',
        'pf',
        'esic',
        'uniform',
        'shoes',
        'other'
      ])
    ),
    []
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);

  const [employeeIssuedItems, setEmployeeIssuedItems] = useState([]);

  const [originalShoesAmount, setOriginalShoesAmount] = useState(0);
  const [originalUniformAmount, setOriginalUniformAmount] = useState(0);
  const [preparedBy, setPreparedBy] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [showDeductions, setShowDeductions] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const [editingRowIndex, setEditingRowIndex] = useState(null);

  // Employee search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showToast, setShowToast] = useState(false);


  // Fetch employees and supervisors from Firestore
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setEmployeesLoading(true);
        console.log("🔄 Fetching employees for salary billing...");
        const employeesRef = collection(db, "employees");

        // Fetch supervisors
        try {
          const supervisorsRef = collection(db, "supervisors");
          const supSnapshot = await getDocs(supervisorsRef);
          const supervisorsList = supSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log("✅ Supervisors fetched:", supervisorsList.length);
          setSupervisors(supervisorsList);
        } catch (supError) {
          console.error("❌ Error fetching supervisors:", supError);
        }

        let employeesList = [];

        try {
          // Fetch ALL employees (removed status filter)
          const querySnapshot = await getDocs(employeesRef);

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(
              "👤 Employee found:",
              doc.id,
              data.name,
              "Status:",
              data.status || 'N/A'
            );
            employeesList.push({
              id: doc.id,
              ...data,
              // Ensure we have hourly rate and basic salary
              hourlyRate: data.hourlyRate || data.salary || "0",
              basicSalary: data.basicSalary || data.salary || "0",
              // Ensure bank details are available
              bankName: data.bankName || "",
              accountNumber: data.accountNumber || "",
              ifscCode: data.ifscCode || "",
              address: data.address || "",
              phone: data.phone || "",
              email: data.email || ""
            });
          });

          console.log(
            `✅ Loaded ${employeesList.length} employees (all statuses)`
          );
        } catch (error) {
          console.error("❌ Error fetching employees:", error);
          throw error;
        }

        console.log(
          "📋 Final employee list:",
          employeesList.map((emp) => ({
            id: emp.id,
            name: emp.name,
            status: emp.status,
            hourlyRate: emp.hourlyRate,
            basicSalary: emp.basicSalary
          }))
        );
        setEmployees(employeesList);

        // 🔍 DEBUG: Print all employee names for search debugging
        console.log('📋 === ALL EMPLOYEES LOADED ===');
        console.log(`Total Employees: ${employeesList.length}`);
        console.table(employeesList.map(emp => ({
          ID: emp.id,
          Name: emp.name || '❌ NO NAME',
          Phone: emp.phone || 'N/A',
          Status: emp.status || 'N/A'
        })));
        console.log('================================');

        if (employeesList.length === 0) {
          console.warn("⚠️ No employees found in database");
          setError(
            "No employees found in the database. Please add employees first."
          );
        }
      } catch (err) {
        console.error("❌ Error fetching employees:", err);
        setError(
          `Failed to load employees: ${err.message}. Please check your Firebase configuration and permissions.`
        );
      } finally {
        setEmployeesLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Filter employees based on search term
  useEffect(() => {
    if (employeeSearchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const searchTerm = employeeSearchTerm.toLowerCase().trim();
      const filtered = employees.filter(emp => {
        // Check if employee has a name
        if (!emp.name) {
          console.warn('⚠️ Employee without name found:', emp);
          return false;
        }

        const employeeName = emp.name.toLowerCase().trim();
        const matches = employeeName.includes(searchTerm);

        // Debug logging
        if (searchTerm.length > 0) {
          console.log(`Search: "${searchTerm}" | Employee: "${emp.name}" | Match: ${matches}`);
        }

        return matches;
      });

      console.log(`🔍 Search results for "${employeeSearchTerm}": ${filtered.length} employees found`);
      setFilteredEmployees(filtered);
    }
  }, [employeeSearchTerm, employees]);

  // Fetch attendance data when month/year or employee changes
  useEffect(() => {
    if (formData.employeeId && formData.month && formData.year) {
      fetchAttendanceData();
      fetchEmployeeAdvanceAndItems();
      fetchBillingData(); // 🔥 AUTOMATICALLY FETCH AND SAVE SALARY DATA
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.employeeId, formData.month, formData.year]);

  // 🔔 Check for recently cleared advances on page load
  useEffect(() => {
    const checkRecentlyClearedAdvances = async () => {
      try {
        console.log('🔍 Checking for recently cleared advances...');

        // Fetch all advance records with status 'fully_deducted'
        const advancesRef = collection(db, 'advance_deduction_history');
        const q = query(advancesRef, where('status', '==', 'fully_deducted'));
        const snapshot = await getDocs(q);

        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000); // Last 24 hours

        let recentlyClearedCount = 0;

        snapshot.docs.forEach((doc) => {
          const advanceData = doc.data();

          // Check if it was cleared recently (within last 24 hours)
          const lastDeductionDate = advanceData.lastDeductionDate
            ? new Date(advanceData.lastDeductionDate)
            : null;

          if (lastDeductionDate && lastDeductionDate > oneDayAgo) {
            recentlyClearedCount++;

            console.log('🎉 Recently cleared advance found:', {
              employee: advanceData.employeeName,
              givenTo: advanceData.givenTo,
              employeeId: advanceData.employeeId,
              amount: advanceData.amount,
              clearedDate: lastDeductionDate
            });

            // Get employee name with multiple fallbacks
            let employeeName = advanceData.employeeName || advanceData.givenTo;

            // If no name found in advance data, fetch from employees array
            if (!employeeName && advanceData.employeeId) {
              const employee = employees.find(emp => emp.id === advanceData.employeeId);
              if (employee) {
                employeeName = employee.name;
                console.log('✅ Employee name fetched from employees array:', employeeName);
              }
            }

            const advanceAmount = parseFloat(advanceData.amount || 0);

            console.log('📋 Employee name detection:', {
              employeeName,
              fromAdvanceData: advanceData.employeeName || advanceData.givenTo,
              fromEmployeesArray: employees.find(emp => emp.id === advanceData.employeeId)?.name,
              willCreateNotification: !!employeeName
            });

            if (!employeeName) {
              console.error('❌ Skipping notification - no valid employee name found for employeeId:', advanceData.employeeId);
              recentlyClearedCount--; // Don't count this
              return;
            }

            // ✅ Only save to bell icon notification - NO toast popup on page load
            // Create database notification with actual cleared date
            createDeductionNotifications(
              { advanceCleared: true, uniformCleared: false, shoesCleared: false },
              advanceData.employeeId,
              employeeName,
              advanceAmount,
              lastDeductionDate // Pass actual cleared date
            ).catch(err => console.error('Error creating notification:', err));
          }
        });

        if (recentlyClearedCount > 0) {
          console.log(`✅ Found ${recentlyClearedCount} recently cleared advances`);
        } else {
          console.log('ℹ️ No recently cleared advances found');
        }
      } catch (error) {
        console.error('❌ Error checking recently cleared advances:', error);
      }
    };

    // Run once on page load
    checkRecentlyClearedAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs once on mount


  // Fetch previous deductions from both salary reports and issued items
  const fetchPreviousDeductions = async (employeeId) => {
    try {
      console.log("📊 Fetching previous deductions for employee:", employeeId);

      // Get employee info for issued items lookup
      const currentEmployee = employees.find(emp => emp.id === employeeId);

      // Method 1: Get deductions from salary reports (for EPFO, ESIC, advance)
      const salaryReportsRef = collection(db, "salary_reports");
      const q = query(
        salaryReportsRef,
        where("employeeId", "==", employeeId)
      );

      const querySnapshot = await getDocs(q);
      let totalPreviousAdvanceDeductions = 0;
      let totalPreviousShoesDeductions = 0;
      let totalPreviousUniformDeductions = 0;
      let totalPreviousEpfoDeductions = 0;
      let totalPreviousEsicDeductions = 0;

      const deductionHistory = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const advanceDeduction = parseFloat(data.advanceDeduction || data.pf || data.advanceTracking?.currentDeduction || 0);
        const shoesDeduction = parseFloat(data.shoes || 0);
        const uniformDeduction = parseFloat(data.uniform || 0);
        const epfoDeduction = parseFloat(data.epfo || 0);
        const esicDeduction = parseFloat(data.esic || 0);

        totalPreviousAdvanceDeductions += advanceDeduction;
        totalPreviousShoesDeductions += shoesDeduction;
        totalPreviousUniformDeductions += uniformDeduction;
        totalPreviousEpfoDeductions += epfoDeduction;
        totalPreviousEsicDeductions += esicDeduction;

        if (advanceDeduction > 0 || shoesDeduction > 0 || uniformDeduction > 0 || epfoDeduction > 0 || esicDeduction > 0) {
          deductionHistory.push({
            month: data.monthName,
            year: data.year,
            advance: advanceDeduction,
            shoes: shoesDeduction,
            uniform: uniformDeduction,
            epfo: epfoDeduction,
            esic: esicDeduction,
            date: data.generatedDate
          });
        }
      });

      // Method 2: Get more accurate shoes and uniform deductions from issued items (only if employee names match)
      if (currentEmployee) {
        const empDocId = currentEmployee.name.replace(/\s+/g, "").toLowerCase();
        const empDocRef = doc(db, "issuedItems", empDocId);
        const empDocSnap = await getDoc(empDocRef);

        if (empDocSnap.exists()) {
          const data = empDocSnap.data();

          // Check if employee name matches
          const issuedItemsEmployeeName = data.employeeName || "";
          const selectedEmployeeName = currentEmployee.name || "";
          const employeeNameMatches = selectedEmployeeName.toLowerCase().trim() === issuedItemsEmployeeName.toLowerCase().trim();

          console.log("👤 Checking employee name match for deductions:");
          console.log("- Selected:", selectedEmployeeName);
          console.log("- Issued items:", issuedItemsEmployeeName);
          console.log("- Match:", employeeNameMatches);

          if (employeeNameMatches) {
            const items = data.items || [];

            // Get total deducted amounts from issued items (more accurate)
            const shoesItem = items.find(item => item.item.toLowerCase().includes('shoes'));
            const uniformItem = items.find(item => item.item.toLowerCase().includes('uniform'));

            if (shoesItem && shoesItem.totalDeducted) {
              totalPreviousShoesDeductions = parseFloat(shoesItem.totalDeducted);
              console.log("👟 Using shoes deductions from issued items:", totalPreviousShoesDeductions);
            }

            if (uniformItem && uniformItem.totalDeducted) {
              totalPreviousUniformDeductions = parseFloat(uniformItem.totalDeducted);
              console.log("👔 Using uniform deductions from issued items:", totalPreviousUniformDeductions);
            }
          } else {
            console.log("❌ Employee names don't match - not using issued items deduction data");
          }
        }
      }

      console.log("💰 Total previous deductions:");
      console.log("- Advance:", totalPreviousAdvanceDeductions);
      console.log("- Shoes:", totalPreviousShoesDeductions);
      console.log("- Uniform:", totalPreviousUniformDeductions);
      console.log("- EPFO:", totalPreviousEpfoDeductions);
      console.log("- ESIC:", totalPreviousEsicDeductions);
      console.log("📋 Deduction history:", deductionHistory);

      return {
        totalPreviousAdvanceDeductions,
        totalPreviousShoesDeductions,
        totalPreviousUniformDeductions,
        totalPreviousEpfoDeductions,
        totalPreviousEsicDeductions,
        deductionHistory
      };
    } catch (error) {
      console.error("❌ Error fetching previous deductions:", error);
      return {
        totalPreviousAdvanceDeductions: 0,
        totalPreviousShoesDeductions: 0,
        totalPreviousUniformDeductions: 0,
        totalPreviousEpfoDeductions: 0,
        totalPreviousEsicDeductions: 0,
        deductionHistory: []
      };
    }
  };



  // Fetch employee advance and issued items
  const fetchEmployeeAdvanceAndItems = async () => {
    if (!formData.employeeId) return;

    try {
      console.log("🔄 Fetching advance for employee:", formData.employeeId);

      let totalAdvance = 0;
      let totalOriginalAdvance = 0;
      let advanceRecords = [];

      // Fetch advance data from 'advance_deduction_history' collection (primary source)
      try {
        const advancesRef = collection(db, 'advance_deduction_history');
        const q = query(advancesRef, where('employeeId', '==', formData.employeeId));
        const snapshot = await getDocs(q);

        console.log(`📊 Found ${snapshot.size} advance records in advance_deduction_history`);

        if (!snapshot.empty) {
          // Log each record for debugging
          snapshot.docs.forEach((doc, index) => {
            const advanceData = doc.data();
            console.log(`📄 Advance Record #${index + 1}:`, {
              id: doc.id,
              originalAmount: advanceData.amount,
              remainingAfterDeduction: advanceData.remainingAfterDeduction,
              remainingAmount: advanceData.remainingAmount,
              status: advanceData.status,
              date: advanceData.date,
              givenBy: advanceData.givenBy
            });

            // Get original amount
            const originalAmount = parseFloat(advanceData.amount || 0);

            // ✅ ONLY use remainingAfterDeduction from advance_deduction_history
            const remainingAmount = parseFloat(advanceData.remainingAfterDeduction || 0);

            // Only add if remaining amount > 0 and status is active
            if (remainingAmount > 0 && advanceData.status !== 'fully_deducted') {
              totalAdvance += remainingAmount;
              totalOriginalAdvance += originalAmount;
              advanceRecords.push({
                docId: doc.id,
                ...advanceData,
                originalAmount: originalAmount,
                currentRemaining: remainingAmount
              });
              console.log(`   💰 Original: ₹${originalAmount}, Remaining: ₹${remainingAmount}`);
            } else {
              console.log(`   ✅ Advance fully paid or inactive (remaining: ₹${remainingAmount})`);
            }
          });
          console.log(`✅ Total original advance: ₹${totalOriginalAdvance}`);
          console.log(`✅ Total remaining advance: ₹${totalAdvance}`);
          console.log(`📋 Active advance records: ${advanceRecords.length}`);
        } else {
          console.log("⚠️ No advance found in advance_deduction_history");
        }
      } catch (error) {
        console.error("❌ Error fetching from advance_deduction_history:", error);
      }

      console.log("💰 Final advance amounts from advance_deduction_history:");
      console.log("   - Total original advance: ₹", totalOriginalAdvance);
      console.log("   - Total remaining advance: ₹", totalAdvance);

      // ❌ NO calculation needed - remainingAfterDeduction already in advance_deduction_history
      // Direct values from database



      // Calculate previous deductions (original - remaining)
      const calculatedPreviousDeductions = totalOriginalAdvance - totalAdvance;

      console.log("📊 Advance summary for display:");
      console.log("   - Original advance: ₹", totalOriginalAdvance);
      console.log("   - Remaining advance: ₹", totalAdvance);
      console.log("   - Already deducted: ₹", calculatedPreviousDeductions);

      // Update form data with advance tracking information
      setFormData(prev => ({
        ...prev,
        originalAdvanceAmount: totalOriginalAdvance.toString(),
        previousAdvanceDeductions: calculatedPreviousDeductions.toString(),
        remainingAdvanceAmount: totalAdvance.toString()
      }));

      // Fetch issued items from issuedItems collection
      console.log("🔍 Fetching issued items...");
      const currentEmployee = employees.find(emp => emp.id === formData.employeeId);
      if (!currentEmployee) {
        console.log("❌ Employee not found");
        return;
      }

      const empDocId = currentEmployee.name.replace(/\s+/g, "").toLowerCase();
      console.log("📋 Looking for issued items document:", empDocId);

      const empDocRef = doc(db, "issuedItems", empDocId);
      const empDocSnap = await getDoc(empDocRef);

      let items = [];
      let employeeNameMatches = false;

      if (empDocSnap.exists()) {
        const data = empDocSnap.data();

        // Check if employee name matches
        const issuedItemsEmployeeName = data.employeeName || "";
        const selectedEmployeeName = currentEmployee.name || "";

        console.log("👤 Comparing employee names:");
        console.log("- Selected employee:", selectedEmployeeName);
        console.log("- Issued items employee:", issuedItemsEmployeeName);

        // Check if names match (case-insensitive)
        employeeNameMatches = selectedEmployeeName.toLowerCase().trim() === issuedItemsEmployeeName.toLowerCase().trim();

        if (employeeNameMatches) {
          items = data.items || [];
          console.log("✅ Employee names match! Using issued items:", items);
        } else {
          console.log("❌ Employee names don't match. Not using issued items data.");
          console.log(`- Expected: "${selectedEmployeeName}"`);
          console.log(`- Found: "${issuedItemsEmployeeName}"`);
        }
      } else {
        console.log("📦 No issued items document found for employee");
      }

      console.log("📦 Total issued items:", items.length);
      console.log("🔍 Employee name matches:", employeeNameMatches);

      // Only use issued items data if employee names match
      if (employeeNameMatches && items.length > 0) {
        console.log("✅ Using real issued items data (employee names match)");
        setEmployeeIssuedItems(items);

        // Store remaining amounts for shoes and uniform from real data
        const shoesItem = items.find(item =>
          item.item.toLowerCase().includes('shoes') || item.item.toLowerCase().includes('shoe')
        );
        const uniformItem = items.find(item =>
          item.item.toLowerCase().includes('uniform')
        );

        console.log("👟 Shoes item found:", shoesItem);
        console.log("👔 Uniform item found:", uniformItem);

        // Calculate TRUE remaining amounts
        // If item has 'remaining' field, use it
        // Otherwise calculate: cost - totalDeducted
        const shoesRemaining = shoesItem
          ? (shoesItem.remaining !== undefined
            ? shoesItem.remaining
            : (shoesItem.cost || 0) - (shoesItem.totalDeducted || 0))
          : 0;

        const uniformRemaining = uniformItem
          ? (uniformItem.remaining !== undefined
            ? uniformItem.remaining
            : (uniformItem.cost || 0) - (uniformItem.totalDeducted || 0))
          : 0;

        console.log("👟 Shoes calculation:", {
          cost: shoesItem?.cost,
          totalDeducted: shoesItem?.totalDeducted,
          remaining: shoesItem?.remaining,
          calculated: shoesRemaining
        });

        console.log("👔 Uniform calculation:", {
          cost: uniformItem?.cost,
          totalDeducted: uniformItem?.totalDeducted,
          remaining: uniformItem?.remaining,
          calculated: uniformRemaining
        });

        setOriginalShoesAmount(shoesRemaining);
        setOriginalUniformAmount(uniformRemaining);

        // Update form data with correct remaining amounts from issued items
        setFormData(prev => ({
          ...prev,
          remainingShoesAmount: shoesRemaining.toString(),
          remainingUniformAmount: uniformRemaining.toString()
        }));

        console.log('✅ FormData updated with remaining amounts:', {
          remainingShoesAmount: shoesRemaining.toString(),
          remainingUniformAmount: uniformRemaining.toString()
        });
      } else {
        // Employee names don't match or no items found - set to zero
        console.log("❌ Employee names don't match or no items found - setting uniform/shoes to zero");
        setEmployeeIssuedItems([]);
        setOriginalShoesAmount(0);
        setOriginalUniformAmount(0);

        // Update form data with zero amounts
        setFormData(prev => ({
          ...prev,
          remainingShoesAmount: "0",
          remainingUniformAmount: "0"
        }));
      }

    } catch (error) {
      console.error("❌ Error fetching employee data:", error);
      // Set default values on error

      setEmployeeIssuedItems([]);
    }
  };

  // 💾 Function to automatically save salary data to Firebase
  const saveSalaryDataToFirebase = async (companyBreakdown, totalSalary, selectedMonth) => {
    try {
      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
      if (!selectedEmployee) {
        console.error("❌ Employee not found for saving salary data");
        return;
      }

      // Get month name from selectedMonth (YYYY-MM format)
      const [year, month] = selectedMonth.split('-');
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const monthAbbr = monthName.toLowerCase().substring(0, 3);

      const salaryData = {
        employeeId: formData.employeeId || "",
        employeeName: selectedEmployee?.name || selectedEmployee?.employeeName || "Unknown",
        month: month || "",
        year: year || "",
        monthName: monthName || "",
        monthYear: selectedMonth || "",
        companyBreakdown: companyBreakdown || [],
        totalSalary: parseFloat(totalSalary || 0).toFixed(2),
        calculatedAt: new Date().toISOString(),
        status: "calculated",
        processedBy: "salary_billing_page",
        // Additional details
        totalDays: companyBreakdown.reduce((sum, company) => sum + (company.totalDays || 0), 0),
        totalHours: companyBreakdown.reduce((sum, company) => sum + parseFloat(company.totalHoursDecimal || 0), 0).toFixed(2),
        companiesWorked: companyBreakdown.length,
        // Breakdown by company
        companiesDetails: companyBreakdown.map(company => ({
          companyId: company.companyId || "",
          companyName: company.companyName || "",
          daysWorked: company.totalDays || 0,
          hoursWorked: company.totalHoursDecimal || 0,
          hourlyRate: company.hourlySalary || 0,
          dayRate: company.dayWiseSalary || 0,
          companySalary: company.companySalary || 0
        }))
      };

      // Create document ID: employeeName month (e.g., rohanjadhav oct)
      const employeeName = (selectedEmployee?.name || selectedEmployee?.employeeName || "unknown").toLowerCase().replace(/\s+/g, '');
      const docId = `${employeeName} ${monthAbbr}`;

      // Save to 'monthly_salary_data' collection
      await setDoc(doc(db, "monthly_salary_data", docId), salaryData);

      console.log("✅ Monthly salary data automatically saved to Firebase:", {
        docId: docId,
        employeeName: selectedEmployee.name,
        month: `${monthName} ${year}`,
        totalSalary: `₹${parseFloat(totalSalary).toFixed(2)}`,
        companies: companyBreakdown.length,
        totalDays: salaryData.totalDays,
        totalHours: salaryData.totalHours
      });

    } catch (error) {
      console.error("❌ Error saving monthly salary data to Firebase:", error);
      // Don't show error to user as this is background operation
    }
  };

  // Fetch billing data from BillingPage calculations with enhanced company-wise breakdown
  const fetchBillingData = async () => {
    if (!formData.employeeId || !formData.month || !formData.year) return;

    try {
      console.log("💰 Fetching billing data for employee:", formData.employeeId);

      const selectedMonth = `${formData.year}-${formData.month.padStart(2, '0')}`;

      // Fetch attendance data for billing calculation (same as BillingPage logic)
      const attendanceRef = collection(db, "attendance");
      const q = query(attendanceRef, where("employeeId", "==", formData.employeeId));
      const snapshot = await getDocs(q);
      const allAttendance = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const filtered = allAttendance.filter((a) =>
        a.date && a.date.startsWith(selectedMonth)
      );

      console.log("📅 Filtered attendance for billing:", filtered);

      if (filtered.length > 0) {
        // 🔹 FETCH EMPLOYEE'S SHIFT-WISE SALARY RATES
        const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
        const salary8Hours = parseFloat(selectedEmployee?.salary8Hours);
        const salary12Hours = parseFloat(selectedEmployee?.salary12Hours);

        console.log(`👤 Employee: ${selectedEmployee?.name}`);
        console.log(`💰 8 Hours Rate: ₹${salary8Hours || 'Not Set'}/month`);
        console.log(`💰 12 Hours Rate: ₹${salary12Hours || 'Not Set'}/month`);

        // ⚠️ VALIDATION: Check if at least one salary rate is assigned
        if ((!salary8Hours || salary8Hours === 0) && (!salary12Hours || salary12Hours === 0)) {
          console.error(`❌ Employee ${selectedEmployee?.name} does not have any shift salary assigned!`);
          setError(`⚠️ Please assign shift salary to employee "${selectedEmployee?.name || 'Unknown'}" first!\n\nGo to Employee Form → Edit → Set 8 Hours or 12 Hours Shift Payment`);

          // Auto-hide error after 60 seconds (1 minute)
          setTimeout(() => {
            setError('');
          }, 60000);

          setFormData(prev => ({
            ...prev,
            calculatedSalary: "0",
            basicSalary: "0",
            billingBreakdown: [],
            totalBillingSalary: "0"
          }));
          return; // Stop calculation
        }

        // ✅ GET ACTUAL DAYS IN THE SELECTED MONTH (for reference only)
        const daysInSelectedMonth = getDaysInMonth(new Date(formData.year, parseInt(formData.month) - 1));

        console.log(`📅 Month: ${formData.month}/${formData.year} has ${daysInSelectedMonth} days`);

        // Group by company (same logic as BillingPage)
        const companyGroups = {};
        filtered.forEach((a) => {
          const companyKey = a.companyId || a.companyName?.trim() || 'unknown';
          if (!companyGroups[companyKey]) {
            companyGroups[companyKey] = [];
          }
          companyGroups[companyKey].push(a);
        });

        let totalBillingSalary = 0;
        const companyBreakdown = [];

        // Helper function to get working hours per record
        const getWorkingHours = (r) => {
          if (r.workingHoursFormatted) {
            const match = r.workingHoursFormatted.match(/(\d+)h\s*(\d*)m?/);
            if (match) {
              const h = parseInt(match[1]) || 0;
              const m = parseInt(match[2]) || 0;
              return h + m / 60;
            }
          }
          const inT = r.checkInTimeFormatted;
          const outT = r.checkOutTimeFormatted;
          if (!inT || !outT) return 0;
          const [inH, inM] = inT.split(":").map(Number);
          const [outH, outM] = outT.split(":").map(Number);
          let diff = outH + outM / 60 - (inH + inM / 60);
          if (diff < 0) diff += 24;
          return diff;
        };

        // Calculate salary for each company
        for (const companyKey in companyGroups) {
          const attendanceList = companyGroups[companyKey];
          let totalMinutes = 0;

          attendanceList.forEach((a) => {
            totalMinutes += getWorkingHours(a) * 60;
          });

          const totalHours = totalMinutes / 60;
          const formattedHours = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;

          // Fetch company shift hours
          let companyShiftHours = 8; // Default
          let companyName = companyKey;

          try {
            const companySnap = await getDocs(
              query(collection(db, "companies"), where("companyId", "==", companyKey))
            );

            if (!companySnap.empty) {
              const companyData = companySnap.docs[0].data();
              companyName = companyData.name || companyData.companyName || companyKey;

              // Get shift hours (8 or 12)
              const shiftString = companyData.shiftHours || companyData.shift || "8 Hours";
              companyShiftHours = parseInt(shiftString) || 8;

              console.log(`🏢 ${companyName} - Shift: ${companyShiftHours} hours`);
            } else {
              console.warn(`⚠️ Company data not found for ${companyKey}, using default 8 hours`);
              companyName = `Company (${companyKey.substring(0, 8)}...)`;
            }
          } catch (error) {
            console.error("Error fetching company data:", error);
            companyName = `Company (${companyKey.substring(0, 8)}...)`;
          }

          // ✅ HOURLY-BASED OVERTIME SALARY CALCULATION
          // Count total days worked
          const totalPresentDays = attendanceList.length;

          // Select appropriate monthly salary based on company shift
          let monthlySalary = 0;
          let shiftType = "";

          if (companyShiftHours === 12) {
            monthlySalary = salary12Hours;
            shiftType = "12 Hours";

            if (!salary12Hours || salary12Hours === 0) {
              console.warn(`⚠️ Employee does not have 12 Hours rate set, using 0`);
            }
          } else {
            // Default to 8 hours
            monthlySalary = salary8Hours;
            shiftType = "8 Hours";

            if (!salary8Hours || salary8Hours === 0) {
              console.warn(`⚠️ Employee does not have 8 Hours rate set, using 0`);
            }
          }

          // 🎯 NEW LOGIC: Actual Month Days calculation
          // Per Day Salary = Monthly Salary / Actual Days in Month
          const perDaySalary = monthlySalary / daysInSelectedMonth;

          // Per Hour Overtime Rate = (Monthly Salary / Actual Days) / Shift Hours
          const perHourOvertimeRate = perDaySalary / companyShiftHours;

          console.log(`🏢 ${companyName}:`);
          console.log(`   💰 Monthly Salary: ₹${monthlySalary.toFixed(2)}`);
          console.log(`   📅 Days in Month: ${daysInSelectedMonth}`);
          console.log(`   📅 Per Day Salary: ₹${perDaySalary.toFixed(2)} (Monthly / ${daysInSelectedMonth})`);
          console.log(`   ⏰ Per Hour Overtime Rate: ₹${perHourOvertimeRate.toFixed(2)} (Per Day / ${companyShiftHours})`);
          console.log(`   Shift Type: ${shiftType}`);

          let companySalary = 0;
          let regularDays = 0;
          let extraDays = 0;
          let totalOvertimeHours = 0;
          let overtimeSalary = 0;
          let isFullMonth = false;

          // 🎯 STEP 1: Base Salary (Full Month vs Partial)
          if (totalPresentDays >= daysInSelectedMonth) {
            // ✅ FULL MONTH → Give complete monthly salary
            companySalary = monthlySalary;
            regularDays = daysInSelectedMonth;
            isFullMonth = true;
            console.log(`   ✅ FULL MONTH! Base: ₹${monthlySalary.toFixed(2)}`);

            // Extra days beyond month?
            extraDays = totalPresentDays - daysInSelectedMonth;
            if (extraDays > 0) {
              const extraPay = extraDays * perDaySalary;
              companySalary += extraPay;
              console.log(`   📅 Extra ${extraDays} days: ₹${extraPay.toFixed(2)}`);
            }
          } else {
            // ⚠️ PARTIAL MONTH → Day-wise
            regularDays = totalPresentDays;
            companySalary = totalPresentDays * perDaySalary;
            console.log(`   ⚠️ Partial: ${totalPresentDays}/${daysInSelectedMonth} days = ₹${companySalary.toFixed(2)}`);
          }

          // 🎯 STEP 2: Hourly Overtime (check each day)
          attendanceList.forEach((attendance, index) => {
            const workedHours = getWorkingHours(attendance);

            // Only overtime if > shift hours
            if (workedHours > companyShiftHours) {
              const extraHours = workedHours - companyShiftHours;
              const dayOTPay = extraHours * perHourOvertimeRate;
              totalOvertimeHours += extraHours;
              overtimeSalary += dayOTPay;
              companySalary += dayOTPay;
              console.log(`      Day ${index + 1}: OT ${extraHours.toFixed(2)}h × ₹${perHourOvertimeRate.toFixed(2)} = ₹${dayOTPay.toFixed(2)}`);
            }
          });

          console.log(`   📊 SUMMARY:`);
          if (isFullMonth) {
            console.log(`   ✅ Full Month: ₹${monthlySalary.toFixed(2)}`);
            if (extraDays > 0) console.log(`   📅 +Extra ${extraDays} days: ₹${(extraDays * perDaySalary).toFixed(2)}`);
          } else {
            console.log(`   📅 ${regularDays} days: ₹${(regularDays * perDaySalary).toFixed(2)}`);
          }
          if (totalOvertimeHours > 0) {
            console.log(`   ⏰ +OT ${totalOvertimeHours.toFixed(2)}h: ₹${overtimeSalary.toFixed(2)}`);
          }
          console.log(`   💰 TOTAL: ₹${companySalary.toFixed(2)}`);

          totalBillingSalary += companySalary;

          companyBreakdown.push({
            companyId: companyKey,
            companyName,
            totalDays: totalPresentDays,
            regularDays: regularDays,
            overtimeHours: totalOvertimeHours.toFixed(2),
            totalHours: formattedHours,  // Still show hours for reference
            totalHoursDecimal: totalHours.toFixed(2),
            shiftType: shiftType,
            perDaySalary: perDaySalary.toFixed(2),
            perHourOvertimeRate: perHourOvertimeRate.toFixed(2),
            monthlySalary: monthlySalary.toFixed(2),
            overtimeSalary: overtimeSalary.toFixed(2),
            companySalary: companySalary.toFixed(2)
          });
        }

        console.log("💰 Total billing salary calculated:", totalBillingSalary);
        console.log("🏢 Company breakdown:", companyBreakdown);

        // Update form data with billing information
        setFormData(prev => ({
          ...prev,
          calculatedSalary: totalBillingSalary.toFixed(2),
          basicSalary: totalBillingSalary.toFixed(2),
          billingBreakdown: companyBreakdown,
          totalBillingSalary: totalBillingSalary.toFixed(2)
        }));

        // 🔥 AUTOMATICALLY SAVE SALARY DATA TO FIREBASE
        await saveSalaryDataToFirebase(companyBreakdown, totalBillingSalary, selectedMonth);

      } else {
        console.log("❌ No attendance records found for billing calculation");
        setFormData(prev => ({
          ...prev,
          calculatedSalary: "0",
          basicSalary: "0",
          billingBreakdown: [],
          totalBillingSalary: "0"
        }));
      }
    } catch (error) {
      console.error("❌ Error fetching billing data:", error);
    }
  };


  // Fetch attendance data for the selected employee and month
  const fetchAttendanceData = async () => {
    if (!formData.employeeId || !formData.month || !formData.year) return;

    try {

      console.log("📊 Fetching attendance data for employee:", formData.employeeId);

      // First fetch billing data
      await fetchBillingData();

      const attendanceRef = collection(db, "attendance");
      const startDate = `${formData.year}-${formData.month}-01`;
      const endDate = `${formData.year}-${formData.month}-${getDaysInMonth(new Date(formData.year, formData.month - 1))}`;

      console.log("📅 Date range:", startDate, "to", endDate);

      let querySnapshot;

      try {
        // Use single where clause to avoid composite index requirement
        const q = query(
          attendanceRef,
          where("employeeId", "==", formData.employeeId)
        );

        querySnapshot = await getDocs(q);
        console.log("✅ Successfully fetched attendance with employeeId filter");
      } catch (queryError) {
        console.warn("⚠️ Employee ID query failed, falling back to fetch all attendance:", queryError);
        // Fallback: fetch all attendance and filter client-side
        querySnapshot = await getDocs(attendanceRef);
        console.log("✅ Fallback: Fetched all attendance records");
      }
      const attendanceList = [];
      let totalWorkingHours = 0;
      let presentDays = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Filter by employeeId and date range on client side to avoid composite index requirement
        const isCorrectEmployee = data.employeeId === formData.employeeId;
        const isInDateRange = data.date && data.date >= startDate && data.date <= endDate;

        if (isCorrectEmployee && isInDateRange) {
          console.log("📝 Attendance record:", data);

          attendanceList.push({ id: doc.id, ...data });

          // Calculate total working hours
          if (data.status === "present" || data.status === "on_duty") {
            presentDays++;
            // If working hours are stored in the attendance record
            if (data.workingHours) {
              totalWorkingHours += parseFloat(data.workingHours) || 0;
            }
          }
        }
      });

      // If working hours aren't stored in attendance, calculate based on standard hours
      if (totalWorkingHours === 0 && presentDays > 0) {
        // Assume 8 hours per working day
        totalWorkingHours = presentDays * 8;
      }

      console.log("🧮 Calculated total working hours:", totalWorkingHours);
      console.log("📅 Present days:", presentDays);



      // Calculate salary based on hourly rate and working hours
      const employeeForSalary = employees.find(emp => emp.id === formData.employeeId);
      if (employeeForSalary) {
        const hourlyRate = parseFloat(employeeForSalary.hourlyRate) || parseFloat(employeeForSalary.basicSalary) / 160 || 0;
        const calculatedSalary = (hourlyRate * totalWorkingHours).toFixed(2);

        console.log("💰 Salary calculation:", {
          hourlyRate,
          totalWorkingHours,
          calculatedSalary
        });

        setFormData(prev => ({
          ...prev,
          totalWorkingHours: totalWorkingHours.toString(),
          hourlyRate: hourlyRate.toString(),
          calculatedSalary: calculatedSalary,
          // Don't override manual basicSalary if it's already set
          basicSalary: prev.basicSalary || calculatedSalary
        }));
      }

    } catch (err) {
      console.error("❌ Error fetching attendance data:", err);
      setError(`Failed to load attendance data: ${err.message}`);
    } finally {

    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedNumericValue = () => {
      if (value === '') return '';
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return '';
      // Allow decimals, just ensure non-negative
      return Math.max(0, numericValue).toString();
    };
    const nextValue = currencyFields.has(name) ? sanitizedNumericValue() : value;

    // If employeeId is being cleared, also clear billing data
    if (name === 'employeeId' && !value) {
      console.log("🧹 Employee ID cleared, clearing billing data");
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        employeeName: "",
        hourlyRate: "",
        basicSalary: "",
        totalWorkingHours: "",
        calculatedSalary: "",
        // Clear billing data
        billingBreakdown: [],
        totalBillingSalary: "0",
        // Clear all tracking data
        originalAdvanceAmount: "0",
        previousAdvanceDeductions: "0",
        remainingAdvanceAmount: "0",
        previousShoesDeductions: "0",
        remainingShoesAmount: "0",
        previousUniformDeductions: "0",
        remainingUniformAmount: "0",
        totalEpfoDeductions: "0",
        totalEsicDeductions: "0"
      }));

      // Clear advance context
      try {
        clearAdvanceData();
      } catch (error) {
        console.error("Error clearing advance data:", error);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: nextValue,
      }));

      // Recalculate salary when working hours change
      if (name === 'totalWorkingHours' && nextValue && formData.hourlyRate) {
        const newWorkingHours = parseFloat(nextValue) || 0;
        const hourlyRate = parseFloat(formData.hourlyRate) || 0;
        const newCalculatedSalary = (hourlyRate * newWorkingHours).toFixed(2);

        console.log("🔄 Recalculating salary:", {
          workingHours: newWorkingHours,
          hourlyRate: hourlyRate,
          newCalculatedSalary: newCalculatedSalary
        });

        setFormData((prev) => ({
          ...prev,
          totalWorkingHours: value,
          calculatedSalary: newCalculatedSalary,
          basicSalary: newCalculatedSalary // Update basic salary with calculated amount
        }));
      }

      // Recalculate salary when hourly rate changes
      if (name === 'hourlyRate' && value && formData.totalWorkingHours) {
        const newHourlyRate = parseFloat(value) || 0;
        const workingHours = parseFloat(formData.totalWorkingHours) || 160;
        const newCalculatedSalary = (newHourlyRate * workingHours).toFixed(2);

        console.log("🔄 Recalculating salary from hourly rate:", {
          hourlyRate: newHourlyRate,
          workingHours: workingHours,
          newCalculatedSalary: newCalculatedSalary
        });

        setFormData((prev) => ({
          ...prev,
          hourlyRate: nextValue,
          calculatedSalary: newCalculatedSalary,
          basicSalary: newCalculatedSalary // Update basic salary with calculated amount
        }));
      }


    }
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    const selectedEmployee = employees.find((emp) => emp.id === employeeId);

    // Clear previous employee data
    console.log("🧹 Clearing previous employee data...");

    setOriginalShoesAmount(0);
    setOriginalUniformAmount(0);
    setEmployeeIssuedItems([]);

    if (selectedEmployee) {
      console.log("👤 Selected employee:", selectedEmployee.name, "(ID:", selectedEmployee.id, ")");
      console.log("🏦 Employee bank details:", {
        bankName: selectedEmployee.bankName,
        accountNumber: selectedEmployee.accountNumber,
        ifscCode: selectedEmployee.ifscCode,
        address: selectedEmployee.address,
        phone: selectedEmployee.phone,
        email: selectedEmployee.email
      });

      // ❌ NO LONGER getting advance from employee collection
      // Advance will be fetched from advance_deduction_history by fetchEmployeeAdvanceAndItems()

      // Calculate basic salary with fallbacks
      const employeeBasicSalary = selectedEmployee.basicSalary || selectedEmployee.salary || "";
      const employeeHourlyRate = selectedEmployee.hourlyRate || (employeeBasicSalary ? parseFloat(employeeBasicSalary) / 160 : "") || "";

      // If no basic salary is set, calculate from hourly rate (assuming 160 hours/month)
      // If still no salary, use a default minimum salary of ₹15000
      const finalBasicSalary = employeeBasicSalary ||
        (employeeHourlyRate ? (parseFloat(employeeHourlyRate) * 160).toFixed(2) : "") ||
        "15000";

      // Calculate final hourly rate based on final basic salary
      const finalHourlyRate = employeeHourlyRate || (parseFloat(finalBasicSalary) / 160).toFixed(2);

      // Calculate monthly salary based on standard working hours (160 hours/month)
      const standardWorkingHours = 160;
      const monthlyCalculatedSalary = (parseFloat(finalHourlyRate) * standardWorkingHours).toFixed(2);

      console.log("💰 Monthly Salary Calculation:", {
        employeeName: selectedEmployee.name,
        hourlyRate: finalHourlyRate,
        standardWorkingHours: standardWorkingHours,
        monthlyCalculatedSalary: monthlyCalculatedSalary,
        finalBasicSalary: finalBasicSalary
      });

      // Set initial form data with calculated amounts
      setFormData((prev) => ({
        ...prev,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name || "",
        hourlyRate: finalHourlyRate,
        basicSalary: monthlyCalculatedSalary, // Use calculated monthly salary
        totalWorkingHours: standardWorkingHours.toString(),
        calculatedSalary: monthlyCalculatedSalary,
        // Don't auto-fill advance deduction field - keep it empty for manual entry
        advanceDeduction: "0",
        // Initial values - will be updated by fetchEmployeeAdvanceAndItems()
        originalAdvanceAmount: "0",
        previousAdvanceDeductions: "0",
        remainingAdvanceAmount: "0",
        previousShoesDeductions: "0",
        remainingShoesAmount: "0", // Will be updated from issuedItems
        previousUniformDeductions: "0",
        remainingUniformAmount: "0" // Will be updated from issuedItems
      }));


    } else {
      // Clear all employee and billing related data when employee is cleared
      console.log("🧹 Clearing employee data and billing information");
      setFormData((prev) => ({
        ...prev,
        employeeId: "",
        employeeName: "",
        hourlyRate: "",
        basicSalary: "",
        totalWorkingHours: "",
        calculatedSalary: "",
        // Clear billing data
        billingBreakdown: [],
        totalBillingSalary: "0",
        // Clear all tracking data
        originalAdvanceAmount: "0",
        previousAdvanceDeductions: "0",
        remainingAdvanceAmount: "0",
        previousShoesDeductions: "0",
        remainingShoesAmount: "0",
        previousUniformDeductions: "0",
        remainingUniformAmount: "0",
        totalEpfoDeductions: "0",
        totalEsicDeductions: "0"
      }));
    }
  };

  const getMonthName = (monthNumber) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[parseInt(monthNumber) - 1] || monthNumber;
  };

  const calculateTotal = () => {
    // Earnings - prioritize manual basic salary over calculated salary
    const basic = parseFloat(formData.basicSalary || formData.calculatedSalary) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const incentives = parseFloat(formData.incentives) || 0;

    // Deductions
    const advance = parseFloat(formData.advanceDeduction) || 0;
    const epfo = parseFloat(formData.epfo) || 0;
    const pf = parseFloat(formData.pf) || 0;
    const esic = parseFloat(formData.esic) || 0;
    const uniform = parseFloat(formData.uniform) || 0;
    const shoes = parseFloat(formData.shoes) || 0;
    const other = parseFloat(formData.other) || 0;

    const totalEarnings = basic + bonus + incentives;
    const totalDeductions = advance + epfo + pf + esic + uniform + shoes + other;

    return (totalEarnings - totalDeductions).toFixed(2);
  };



  // Function to update issuedItems collection with deductions
  const updateIssuedItemsWithDeductions = async (employeeId, deductions) => {
    try {
      console.log("📦 Updating issued items with deductions...");

      const currentEmployee = employees.find(emp => emp.id === employeeId);
      if (!currentEmployee) {
        console.error("❌ Employee not found for issued items update");
        return;
      }

      const empDocId = currentEmployee.name.replace(/\s+/g, "").toLowerCase();
      const empDocRef = doc(db, "issuedItems", empDocId);
      const empDocSnap = await getDoc(empDocRef);

      if (empDocSnap.exists()) {
        const data = empDocSnap.data();
        const items = data.items || [];

        // Update remaining amounts for each item
        let shoesCleared = false;
        let uniformCleared = false;
        let originalShoesAmount = 0;
        let originalUniformAmount = 0;

        const updatedItems = items.map(item => {
          if (item.item.toLowerCase().includes('shoes') && deductions.shoesDeduction > 0) {
            const currentRemaining = item.remaining || item.cost;
            const newRemaining = Math.max(0, currentRemaining - deductions.shoesDeduction);
            console.log(`👟 Updating shoes: ${currentRemaining} - ${deductions.shoesDeduction} = ${newRemaining}`);

            // Check if shoes cleared
            if (newRemaining === 0 && currentRemaining > 0) {
              shoesCleared = true;
              originalShoesAmount = parseFloat(item.cost || 0);
              console.log('🎉 SHOES FULLY CLEARED! Original amount:', originalShoesAmount);
            }

            return {
              ...item,
              remaining: newRemaining,
              totalDeducted: (item.totalDeducted || 0) + deductions.shoesDeduction,
              lastDeductionDate: new Date().toISOString(),
              deductionHistory: [
                ...(item.deductionHistory || []),
                {
                  amount: deductions.shoesDeduction,
                  date: new Date().toISOString(),
                  month: formData.month,
                  year: formData.year,
                  billId: `BILL-${Date.now()}`
                }
              ]
            };
          }

          if (item.item.toLowerCase().includes('uniform') && deductions.uniformDeduction > 0) {
            const currentRemaining = item.remaining || item.cost;
            const newRemaining = Math.max(0, currentRemaining - deductions.uniformDeduction);
            console.log(`👔 Updating uniform: ${currentRemaining} - ${deductions.uniformDeduction} = ${newRemaining}`);

            // Check if uniform cleared
            if (newRemaining === 0 && currentRemaining > 0) {
              uniformCleared = true;
              originalUniformAmount = parseFloat(item.cost || 0);
              console.log('🎉 UNIFORM FULLY CLEARED! Original amount:', originalUniformAmount);
            }

            return {
              ...item,
              remaining: newRemaining,
              totalDeducted: (item.totalDeducted || 0) + deductions.uniformDeduction,
              lastDeductionDate: new Date().toISOString(),
              deductionHistory: [
                ...(item.deductionHistory || []),
                {
                  amount: deductions.uniformDeduction,
                  date: new Date().toISOString(),
                  month: formData.month,
                  year: formData.year,
                  billId: `BILL-${Date.now()}`
                }
              ]
            };
          }

          return item;
        });

        // Update the document with new remaining amounts
        await updateDoc(empDocRef, {
          items: updatedItems,
          lastUpdated: new Date().toISOString()
        });

        // 🎉 Show toast notifications if items are cleared
        if (shoesCleared) {
          console.log('🎉 Showing toast: Shoes cleared!');
          setToastMessage(`✅ ${currentEmployee.name} - ₹${originalShoesAmount} shoes cleared`);
          setToastType('success');
          setShowToast(true);

          // Also create database notification
          await createDeductionNotifications(
            { advanceCleared: false, uniformCleared: false, shoesCleared: true },
            employeeId,
            currentEmployee.name,
            0, // advance amount
            new Date(), // cleared date
            0, // uniform amount
            originalShoesAmount // shoes amount
          );
        }

        if (uniformCleared) {
          console.log('🎉 Showing toast: Uniform cleared!');
          setToastMessage(`✅ ${currentEmployee.name} - ₹${originalUniformAmount} uniform cleared`);
          setToastType('success');
          setShowToast(true);

          // Also create database notification
          await createDeductionNotifications(
            { advanceCleared: false, uniformCleared: true, shoesCleared: false },
            employeeId,
            currentEmployee.name,
            0, // advance amount
            new Date(), // cleared date
            originalUniformAmount, // uniform amount
            0 // shoes amount
          );
        }

        console.log("✅ Issued items updated successfully with deductions");
      } else {
        console.log("⚠️ No issued items document found for employee");
      }
    } catch (error) {
      console.error("❌ Error updating issued items:", error);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🎯 Generate Slip clicked!');
    console.log('📋 Form Data:', formData);
    console.log('💰 Payment Status:', formData.status);

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Fetch deduction history before creating billData
      const deductionData = await fetchPreviousDeductions(formData.employeeId);
      console.log('📊 Fetched deduction history:', deductionData);
      console.log('📊 Deduction history array:', deductionData.deductionHistory);
      console.log('📊 Deduction history length:', deductionData.deductionHistory?.length || 0);

      const billData = {
        ...formData,
        totalAmount: calculateTotal(),
        generatedDate: new Date().toISOString(),
        billId: `BILL-${Date.now()}`,
        monthName: getMonthName(formData.month),
        status: formData.status || "pending", // Use the payment status from form
        createdAt: new Date(),
        updatedAt: new Date(),
        // Include calculation details
        calculationDetails: {
          hourlyRate: formData.hourlyRate,
          totalWorkingHours: formData.totalWorkingHours,
          calculatedBasicSalary: formData.calculatedSalary,
          totalBillingSalary: formData.totalBillingSalary,
          billingBreakdown: formData.billingBreakdown
        },
        // Company information
        companyInfo: formData.companyId ? getCompanyById(formData.companyId) : null,
        // Employee bank details
        employeeBankDetails: (() => {
          const employeeForBank = employees.find(emp => emp.id === formData.employeeId);
          return {
            bankName: employeeForBank?.bankName || 'Bank Of India',
            accountNumber: employeeForBank?.accountNumber || '1234567890123456',
            ifscCode: employeeForBank?.ifscCode || 'BKID0001234',
            address: employeeForBank?.address || 'Not Available',
            phone: employeeForBank?.phone || 'Not Available',
            email: employeeForBank?.email || 'Not Available',
            esiNumber: employeeForBank?.esiNumber || employeeForBank?.esiNo || 'N/A',
            pfNumber: employeeForBank?.pfNumber || employeeForBank?.pfNo || 'N/A'
          };
        })(),
        // Earnings breakdown
        earnings: {
          basicSalary: parseFloat(formData.basicSalary) || 0,
          bonus: parseFloat(formData.bonus) || 0,
          incentives: parseFloat(formData.incentives) || 0,
          totalEarnings: (parseFloat(formData.basicSalary) || 0) + (parseFloat(formData.bonus) || 0) + (parseFloat(formData.incentives) || 0)
        },
        // Deductions breakdown
        deductions: {
          advanceDeduction: parseFloat(formData.advanceDeduction) || 0,
          pf: parseFloat(formData.pf) || 0,
          epfo: parseFloat(formData.epfo) || 0,
          esic: parseFloat(formData.esic) || 0,
          uniform: parseFloat(formData.uniform) || 0,
          shoes: parseFloat(formData.shoes) || 0,
          other: parseFloat(formData.other) || 0,
          totalDeductions: (parseFloat(formData.advanceDeduction) || 0) + (parseFloat(formData.pf) || 0) + (parseFloat(formData.epfo) || 0) + (parseFloat(formData.esic) || 0) + (parseFloat(formData.uniform) || 0) + (parseFloat(formData.shoes) || 0) + (parseFloat(formData.other) || 0),
          // Detailed deduction information
          deductionDetails: [
            { type: "Advance", amount: parseFloat(formData.advanceDeduction) || 0, description: "Advance Amount Deduction" },
            { type: "PF", amount: parseFloat(formData.pf) || 0, description: "Provident Fund" },
            { type: "EPFO", amount: parseFloat(formData.epfo) || 0, description: "Employee Provident Fund Organization" },
            { type: "ESIC", amount: parseFloat(formData.esic) || 0, description: "Employee State Insurance Corporation" },
            { type: "Uniform", amount: parseFloat(formData.uniform) || 0, description: "Uniform Deduction" },
            { type: "Shoes", amount: parseFloat(formData.shoes) || 0, description: "Shoes Deduction" },
            { type: "Other", amount: parseFloat(formData.other) || 0, description: "Other Deductions" }
          ].filter(item => item.amount > 0), // Only include deductions with amount > 0
          deductionSummary: {
            statutoryDeductions: (parseFloat(formData.advanceDeduction) || 0) + (parseFloat(formData.pf) || 0) + (parseFloat(formData.epfo) || 0) + (parseFloat(formData.esic) || 0),
            otherDeductions: (parseFloat(formData.uniform) || 0) + (parseFloat(formData.shoes) || 0) + (parseFloat(formData.other) || 0),
            hasDeductions: ((parseFloat(formData.advanceDeduction) || 0) + (parseFloat(formData.pf) || 0) + (parseFloat(formData.epfo) || 0) + (parseFloat(formData.esic) || 0) + (parseFloat(formData.uniform) || 0) + (parseFloat(formData.shoes) || 0) + (parseFloat(formData.other) || 0)) > 0
          }
        },
        // Advance tracking information
        advanceTracking: {
          originalAmount: parseFloat(formData.originalAdvanceAmount) || 0,
          previousDeductions: parseFloat(formData.previousAdvanceDeductions) || 0,
          currentDeduction: parseFloat(formData.advanceDeduction) || 0,
          remainingBeforeDeduction: parseFloat(formData.remainingAdvanceAmount) || 0,
          remainingAfterDeduction: (parseFloat(formData.remainingAdvanceAmount) || 0) - (parseFloat(formData.advanceDeduction) || 0),
          totalDeductedSoFar: (parseFloat(formData.previousAdvanceDeductions) || 0) + (parseFloat(formData.advanceDeduction) || 0),
          advanceStatus: (parseFloat(formData.remainingAdvanceAmount) || 0) - (parseFloat(formData.advanceDeduction) || 0) <= 0 ? 'fully_deducted' : 'partial_deducted',
          // Add deduction history for display
          deductionHistory: deductionData?.deductionHistory || []
        },
        // Payment information
        paymentInfo: {
          paymentMethod: formData.paymentMethod,
          paymentStatus: formData.status,
          paymentDate: formData.paymentDate,
          netAmount: calculateTotal()
        }
      };

      console.log("💰 Generated bill data:", billData);

      // Create custom document ID: employeeName month-year (e.g., rohanjadhav march-2025)
      const employeeName = billData.employeeName.toLowerCase().replace(/\s+/g, '');
      const monthYear = `${billData.monthName.toLowerCase()}-${billData.year}`;
      const documentId = `${employeeName} ${monthYear}`;

      console.log("📊 Saving to salary_reports collection with custom document ID:");
      console.log(`- Document ID: ${documentId}`);
      console.log("- Employee:", billData.employeeName);
      console.log("- Month:", billData.monthName, billData.year);
      console.log("- Basic Salary:", billData.earnings.basicSalary);
      console.log("- Total Earnings:", billData.earnings.totalEarnings);
      console.log("- Total Deductions:", billData.deductions.totalDeductions);
      console.log("- Deduction Details:", billData.deductions.deductionDetails);
      console.log("- Statutory Deductions:", billData.deductions.deductionSummary.statutoryDeductions);
      console.log("- Other Deductions:", billData.deductions.deductionSummary.otherDeductions);
      console.log("- Net Amount:", billData.paymentInfo.netAmount);
      console.log("- Payment Status:", billData.paymentInfo.paymentStatus);
      console.log("- Billing Breakdown:", billData.calculationDetails.billingBreakdown);
      console.log("📊 Advance Tracking Information:");
      console.log("- Original Advance:", billData.advanceTracking.originalAmount);
      console.log("- Previous Deductions:", billData.advanceTracking.previousDeductions);
      console.log("- Current Deduction:", billData.advanceTracking.currentDeduction);
      console.log("- Remaining Before:", billData.advanceTracking.remainingBeforeDeduction);
      console.log("- Remaining After:", billData.advanceTracking.remainingAfterDeduction);
      console.log("- Total Deducted So Far:", billData.advanceTracking.totalDeductedSoFar);
      console.log("- Advance Status:", billData.advanceTracking.advanceStatus);
      console.log("🔍 DEDUCTION HISTORY:");
      console.log("- History Array:", billData.advanceTracking.deductionHistory);
      console.log("- History Length:", billData.advanceTracking.deductionHistory?.length || 0);
      console.log("- History Items:", JSON.stringify(billData.advanceTracking.deductionHistory, null, 2));

      // ❌ DO NOT save here - will save when OK button is clicked
      console.log("📋 Bill data prepared (not saved yet)");
      console.log("⏳ Waiting for user to click OK button...");

      // Update issued items with deductions
      const deductions = {
        shoesDeduction: parseFloat(formData.shoes || 0),
        uniformDeduction: parseFloat(formData.uniform || 0),
        advanceDeduction: parseFloat(formData.advanceDeduction || 0)
      };

      // Batch all database operations together for better performance
      const dbOperations = [];

      if (deductions.shoesDeduction > 0 || deductions.uniformDeduction > 0) {
        dbOperations.push(updateIssuedItemsWithDeductions(formData.employeeId, deductions));
      }

      // Update employee remaining amounts after successful bill generation
      try {
        // Update advance_deduction_history records with remaining amounts
        if (parseFloat(formData.advanceDeduction || 0) > 0) {
          const deductionAmount = parseFloat(formData.advanceDeduction || 0);
          let remainingToDeduct = deductionAmount;

          console.log(`💰 Processing advance deduction of ₹${deductionAmount}`);

          // Fetch all advance records for this employee
          const advancesRef = collection(db, 'advance_deduction_history');
          const q = query(advancesRef, where('employeeId', '==', formData.employeeId));
          const snapshot = await getDocs(q);

          // Update each advance record with deduction
          for (const docSnap of snapshot.docs) {
            if (remainingToDeduct <= 0) break;

            const advanceData = docSnap.data();
            const currentRemaining = parseFloat(
              advanceData.remainingAfterDeduction ||
              advanceData.remainingAmount ||
              advanceData.amount ||
              0
            );

            if (currentRemaining > 0) {
              const deductFromThis = Math.min(currentRemaining, remainingToDeduct);
              const newRemaining = currentRemaining - deductFromThis;

              console.log(`📝 Updating advance record ${docSnap.id}:`);
              console.log(`   - Current remaining: ₹${currentRemaining}`);
              console.log(`   - Deducting: ₹${deductFromThis}`);
              console.log(`   - New remaining: ₹${newRemaining}`);

              // Update the advance record
              const updateData = {
                remainingAfterDeduction: newRemaining,
                remainingAmount: newRemaining,
                lastDeductionDate: new Date().toISOString(),
                lastDeductionAmount: deductFromThis,
                lastDeductionMonth: formData.month,
                lastDeductionYear: formData.year,
                status: newRemaining === 0 ? 'fully_deducted' : 'active',
                updatedAt: new Date()
              };

              // Add deduction history
              if (!advanceData.deductionHistory) {
                updateData.deductionHistory = [];
              } else {
                updateData.deductionHistory = advanceData.deductionHistory;
              }

              updateData.deductionHistory.push({
                amount: deductFromThis,
                date: new Date().toISOString(),
                month: formData.month,
                year: formData.year,
                monthName: getMonthName(formData.month),
                salarySlipId: documentId
              });

              // 1️⃣ Update advance_deduction_history collection
              dbOperations.push(updateDoc(doc(db, 'advance_deduction_history', docSnap.id), updateData));

              // 2️⃣ Update advances collection (find matching record by employeeId and date)
              const advancesCollectionRef = collection(db, 'advances');
              const advancesQuery = query(
                advancesCollectionRef,
                where('employeeId', '==', formData.employeeId),
                where('historyDocId', '==', docSnap.id)
              );
              const advancesSnapshot = await getDocs(advancesQuery);

              if (!advancesSnapshot.empty) {
                advancesSnapshot.forEach((advDoc) => {
                  console.log(`📝 Also updating advances collection: ${advDoc.id}`);
                  dbOperations.push(updateDoc(doc(db, 'advances', advDoc.id), updateData));
                });
              } else {
                console.log(`⚠️ No matching record found in advances collection for historyDocId: ${docSnap.id}`);
              }

              // 🎉 Check if advance is fully cleared and show toast notification
              if (newRemaining === 0 && currentRemaining > 0) {
                const originalAmount = parseFloat(advanceData.amount || 0);
                const clearedDate = new Date();
                console.log('🎉 ADVANCE FULLY CLEARED! Showing toast notification...');
                setToastMessage(`✅ ${formData.employeeName} - ₹${originalAmount} advance cleared`);
                setToastType('success');
                setShowToast(true);

                // Also create database notification
                await createDeductionNotifications(
                  { advanceCleared: true, uniformCleared: false, shoesCleared: false },
                  formData.employeeId,
                  formData.employeeName,
                  originalAmount,
                  clearedDate // Current time when cleared
                );
              }

              remainingToDeduct -= deductFromThis;
            }
          }

          console.log(`✅ Advance deduction processed in both collections. Remaining to deduct: ₹${remainingToDeduct}`);
        }



        console.log('✅ Deductions saved to respective collections (not in employee collection)');

        // Execute all database operations in parallel for better performance
        await Promise.all(dbOperations);

      } catch (balanceError) {
        console.error("⚠️ Error updating employee balances:", balanceError);
        // Continue with bill generation even if balance update fails
      }

      // Add receivedBy (employee name) to billData
      billData.receivedBy = billData.employeeName;

      // Open modal and stop loading IMMEDIATELY
      console.log('✅ Bill prepared! Opening modal...');
      console.log('📄 Generated Bill:', billData);
      console.log('👤 Received By:', billData.receivedBy);

      setLoading(false);
      setGeneratedBill(billData);
      setSuccess(true);
      setIsBillModalOpen(true);

      console.log('🎉 Modal state set to true');

      // Reset form in background (non-blocking) - user doesn't need to wait for this
      setTimeout(() => {
        setFormData({
          employeeId: "",
          employeeName: "",
          companyId: "",
          month: format(new Date(), "MM"),
          year: format(new Date(), "yyyy"),
          basicSalary: "",
          hourlyRate: "",
          totalWorkingHours: "",
          calculatedSalary: "",
          bonus: "0",
          incentives: "0",
          pf: "0",
          epfo: "0",
          esic: "0",
          uniform: "0",
          shoes: "0",
          other: "0",
          notes: "",
          paymentDate: format(new Date(), "yyyy-MM-dd"),
          billingBreakdown: [],
          totalBillingSalary: "0",
          originalAdvanceAmount: "0",
          previousAdvanceDeductions: "0",
          remainingAdvanceAmount: "0",
          previousShoesDeductions: "0",
          remainingShoesAmount: "0",
          previousUniformDeductions: "0",
          remainingUniformAmount: "0",
          totalEpfoDeductions: "0",
          totalEsicDeductions: "0",
          paymentMethod: "bank_transfer",
          status: "",
        });
        clearAdvanceData();
      }, 0);

    } catch (err) {
      console.error("❌ Error saving salary billing:", err);
      setError("Failed to save salary billing. Please try again.");
      setLoading(false);
    }
  };

  const totalAmount = useMemo(() => {
    return calculateTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.basicSalary,
    formData.calculatedSalary,
    formData.bonus,
    formData.incentives,
    formData.advanceDeduction,
    formData.epfo,
    formData.pf,
    formData.esic,
    formData.uniform,
    formData.shoes,
    formData.other
  ]);

  // Cancel/Close modal without saving
  const handleCancelBillModal = () => {
    const confirmCancel = window.confirm('Are you sure you want to close without saving? All data will be lost.');
    if (confirmCancel) {
      console.log("❌ User cancelled - closing modal without saving");
      setIsBillModalOpen(false);
      setGeneratedBill(null);
      setSuccess(false);
      setPreparedBy('');
      setShowDeductions(false);
    }
  };

  // Save and close modal (OK button)
  const handleCloseBillModal = async () => {
    if (!generatedBill || !preparedBy.trim()) {
      alert('Please select Prepared By name before saving');
      return;
    }

    try {
      setLoading(true);

      // Add preparedBy to bill data
      const billDataToSave = {
        ...generatedBill,
        preparedBy: preparedBy,
        savedAt: new Date().toISOString()
      };

      // Create custom document ID: employeeName month-year (e.g., rohanjadhav march-2025)
      const employeeName = billDataToSave.employeeName.toLowerCase().replace(/\s+/g, '');
      const monthYear = `${billDataToSave.monthName.toLowerCase()}-${billDataToSave.year}`;
      const documentId = `${employeeName} ${monthYear}`;

      console.log("💾 Saving salary slip to salary_reports...");
      console.log("- Document ID:", documentId);
      console.log("- Employee:", billDataToSave.employeeName);
      console.log("- Prepared By:", preparedBy);

      // Save to salary_reports collection
      await setDoc(doc(db, "salary_reports", documentId), billDataToSave);

      console.log("✅ Salary slip saved successfully!");



      // Close modal and reset
      setIsBillModalOpen(false);
      setGeneratedBill(null);
      setSuccess(false);
      setPreparedBy('');
      setShowDeductions(false);
      setLoading(false);

    } catch (error) {
      console.error("❌ Error saving salary slip:", error);

      setLoading(false);
    }
  };

  const handleEditBill = () => {
    // Close modal and allow user to edit the form
    setIsBillModalOpen(false);
    setSuccess(false);
    // Keep the generated bill data so user can modify it
  };

  const handlePrintBill = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!generatedBill) return;

    const doc = new jsPDF();

    // Get company information
    const companyInfo = generatedBill.companyInfo;

    // Company Header
    if (companyInfo) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(companyInfo.fullName, 105, 15, null, null, "center");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(companyInfo.address, 105, 22, null, null, "center");
      doc.text(`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`, 105, 28, null, null, "center");
    }



    // Employee Information Section
    let yPos = 35;
    doc.setFillColor(173, 216, 230);
    doc.rect(15, yPos, 180, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Employee Information", 105, yPos + 6, null, null, "center");

    // Employee Details - Left Column
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Left side - Employee Information
    doc.text(
      `Employee Name : ${generatedBill.employeeName || "N/A"}`,
      20,
      yPos
    );
    doc.text(
      `Employee Address : ${generatedBill.employeeBankDetails?.address || "N/A"}`,
      20,
      yPos + 8
    );
    doc.text(
      `Employee Phone no : ${generatedBill.employeeBankDetails?.phone || "N/A"}`,
      20,
      yPos + 16
    );
    doc.text(
      `Employee Email ID : ${generatedBill.employeeBankDetails?.email || "N/A"}`,
      20,
      yPos + 24
    );
    doc.text(
      `ESI No : ${generatedBill.employeeBankDetails?.esiNumber || generatedBill.employeeBankDetails?.esiNo || "N/A"}`,
      20,
      yPos + 32
    );

    // Right side - Payment & Bank Details
    doc.text(
      `Payment Date : ${generatedBill.paymentDate || "N/A"}`,
      110,
      yPos
    );
    doc.text(
      `Month/Year : ${generatedBill.monthName || "N/A"} ${generatedBill.year || ""}`,
      110,
      yPos + 8
    );
    doc.text(
      `Bank Name : ${generatedBill.employeeBankDetails?.bankName || "N/A"}`,
      110,
      yPos + 16
    );
    doc.text(
      `Account Number : ${generatedBill.employeeBankDetails?.accountNumber || "N/A"}`,
      110,
      yPos + 24
    );
    doc.text(
      `IFSC Code : ${generatedBill.employeeBankDetails?.ifscCode || "N/A"}`,
      110,
      yPos + 32
    );
    doc.text(
      `PF Number : ${generatedBill.employeeBankDetails?.pfNumber || generatedBill.employeeBankDetails?.pfNo || "N/A"}`,
      110,
      yPos + 40
    );

    // Manual Table Creation (Earnings and Deductions)
    yPos += 56; // Increased for ESI and PF lines

    // Table Header
    doc.setFillColor(173, 216, 230);
    doc.rect(15, yPos, 45, 8, "F");
    doc.rect(60, yPos, 45, 8, "F");
    doc.rect(105, yPos, 45, 8, "F");
    doc.rect(150, yPos, 45, 8, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Earnings", 37.5, yPos + 5, null, null, "center");
    doc.text("Amount", 82.5, yPos + 5, null, null, "center");
    doc.text("Deductions", 127.5, yPos + 5, null, null, "center");
    doc.text("Amount", 172.5, yPos + 5, null, null, "center");

    // Table Rows with new structure
    const totalEarnings =
      parseFloat(generatedBill.basicSalary || 0) +
      parseFloat(generatedBill.bonus || 0) +
      parseFloat(generatedBill.incentives || 0);
    const totalDeductions =
      parseFloat(generatedBill.advanceDeduction || 0) +
      parseFloat(generatedBill.pf || 0) +
      parseFloat(generatedBill.epfo || 0) +
      parseFloat(generatedBill.esic || 0) +
      parseFloat(generatedBill.uniform || 0) +
      parseFloat(generatedBill.shoes || 0) +
      parseFloat(generatedBill.other || 0);

    const tableData = [
      [
        "Basic Salary",
        `₹${generatedBill.basicSalary || 0}`,
        "PF (Provident Fund)",
        `₹${generatedBill.pf || 0}`,
      ],
      [
        "Bonus",
        `₹${generatedBill.bonus || 0}`,
        "EPFO",
        `₹${generatedBill.epfo || 0}`,
      ],
      [
        "Incentives",
        `₹${generatedBill.incentives || 0}`,
        "ESIC",
        `₹${generatedBill.esic || 0}`,
      ],
      ["", "", "Uniform", `₹${generatedBill.uniform || 0}`],
      ["", "", "Shoes", `₹${generatedBill.shoes || 0}`],
      ["", "", "", ""],
      ["", "", "", ""],
      ["", "", "", ""],
      [
        "Total Earnings",
        `₹${totalEarnings.toFixed(2)}`,
        "Total Deductions",
        `₹${totalDeductions.toFixed(2)}`,
      ],
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    tableData.forEach((row, index) => {
      yPos += 8;

      // Draw cell borders
      doc.rect(15, yPos, 45, 8);
      doc.rect(60, yPos, 45, 8);
      doc.rect(105, yPos, 45, 8);
      doc.rect(150, yPos, 45, 8);

      // Add text
      if (index === tableData.length - 1) {
        doc.setFont("helvetica", "bold");
      }

      doc.text(row[0], 17, yPos + 5);
      doc.text(row[1], 62, yPos + 5);
      doc.text(row[2], 107, yPos + 5);
      doc.text(row[3], 152, yPos + 5);

      if (index === tableData.length - 1) {
        doc.setFont("helvetica", "normal");
      }
    });

    // Net Pay Section
    yPos += 15;
    const netPay = parseFloat(generatedBill.totalAmount || 0);

    doc.setFillColor(173, 216, 230);
    doc.rect(15, yPos, 45, 8, "F");
    doc.rect(60, yPos, 135, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Net Pay", 37.5, yPos + 5, null, null, "center");
    doc.text(
      `In Words : ${convertNumberToWords(netPay)} Rupees Only`,
      62,
      yPos + 5
    );

    // Deduction Details Section - Only if showDeductions is true
    // PREMIUM PDF DEDUCTION DESIGN
    if (showDeductions && generatedBill.advanceTracking) {
      yPos += 15;

      // Title
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPos, 180, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Advance Salary Deduction Details", 105, yPos + 5, { align: "center" });

      yPos += 14;

      // Summary
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(`Original: ₹${generatedBill.advanceTracking.originalAmount}`, 18, yPos);
      doc.text(`Deducted: ₹${generatedBill.advanceTracking.currentDeduction}`, 80, yPos);
      doc.text(`Remaining: ₹${generatedBill.advanceTracking.remainingAfterDeduction}`, 145, yPos);

      if (generatedBill.advanceTracking.previousDeductions > 0) {
        yPos += 7;
        doc.text(`Previously Deducted: ₹${generatedBill.advanceTracking.previousDeductions}`, 18, yPos);
      }

      yPos += 10;

      // Table Header
      doc.setFillColor(210, 210, 210);
      doc.rect(15, yPos, 20, 8, "F");
      doc.rect(35, yPos, 60, 8, "F");
      doc.rect(95, yPos, 50, 8, "F");
      doc.rect(145, yPos, 50, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text("#", 25, yPos + 5);
      doc.text("Month", 60, yPos + 5);
      doc.text("Amount", 120, yPos + 5);
      doc.text("Date", 170, yPos + 5);

      // Deduction rows
      doc.setFont("helvetica", "normal");

      generatedBill.advanceTracking.deductionHistory.forEach((row, i) => {
        yPos += 8;

        // Row Boxes
        doc.rect(15, yPos, 20, 8);
        doc.rect(35, yPos, 60, 8);
        doc.rect(95, yPos, 50, 8);
        doc.rect(145, yPos, 50, 8);

        // Row Text
        doc.text(String(i + 1), 23, yPos + 5);
        doc.text(`${row.monthName || row.month} ${row.year}`, 40, yPos + 5);

        // Red Amount
        doc.setTextColor(255, 0, 0);
        doc.text(`₹${parseFloat(row.amount || row.advance || 0).toFixed(2)}`, 120, yPos + 5);
        doc.setTextColor(0, 0, 0);

        const d = row.date ? new Date(row.date).toLocaleDateString("en-IN") : "N/A";
        doc.text(d, 150, yPos + 5);
      });

      yPos += 12;
    }



    // Signature Section
    yPos += 20;

    doc.setFillColor(173, 216, 230);
    doc.rect(15, yPos, 90, 8, "F");
    doc.rect(105, yPos, 90, 8, "F");

    doc.setFont("helvetica", "bold");

    const preparedByName = preparedBy || generatedBill.preparedBy || '';
    const receivedByName = generatedBill.receivedBy || generatedBill.employeeName || '';

    // Display "Prepared by : Name" format
    doc.text(`Prepared by : ${preparedByName}`, 17, yPos + 5);
    doc.text(`Received by : ${receivedByName}`, 107, yPos + 5);

    // Signature spaces
    doc.rect(15, yPos + 8, 90, 16);
    doc.rect(105, yPos + 8, 90, 16);

    doc.save(
      `${generatedBill.employeeName}_SalarySlip_${generatedBill.monthName}_${generatedBill.year}.pdf`
    );
  };

  console.log("🎨 About to render JSX...");
  console.log("- Employees:", employees.length);
  console.log("- Loading:", employeesLoading);
  console.log("- Error:", error);

  return (
    <div className="p-6">

      <style suppressHydrationWarning>{`
        /* Screen styles - hide print-only elements */
        @media screen {
          .print-only {
            display: none !important;
          }
        }
        
        /* Print styles */
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }
          
          /* Show only the salary slip modal and its contents */
          .salary-slip-modal,
          .salary-slip-modal * {
            visibility: visible !important;
          }
          
          /* Hide no-print elements */
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show print-only elements */
          .print-only {
            display: block !important;
            visibility: visible !important;
          }
          
          /* Make modal full page for print */
          .salary-slip-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }
          
          .salary-slip-modal > div {
            position: static !important;
            margin: 0 !important;
            padding: 20px !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          
          .bill-content {
            background: white !important;
            box-shadow: none !important;
            padding: 15px !important;
            margin: 0 !important;
            max-width: none !important;
            border: none !important;
          }
          
          /* Ensure proper page layout */
          @page {
            margin: 0.5cm;
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-gradient-to-br {
            background: white !important;
          }
          .bg-white {
            background: white !important;
            box-shadow: none !important;
          }
          .bg-gray-50,
          .bg-blue-50,
          .bg-green-50,
          .bg-red-50,
          .bg-purple-50,
          .bg-yellow-50,
          .bg-indigo-50 {
            background: white !important;
            border: 1px solid #e5e7eb !important;
            padding: 8px !important;
            margin: 4px 0 !important;
          }
          .text-blue-700,
          .text-green-700,
          .text-red-700,
          .text-purple-700,
          .text-yellow-800,
          .text-indigo-700 {
            color: #374151 !important;
          }
          .text-blue-900,
          .text-green-900,
          .text-red-900,
          .text-purple-900,
          .text-indigo-900 {
            color: #111827 !important;
          }
          .font-bold {
            font-weight: bold !important;
          }
          .border-l-4 {
            border-left: 4px solid #3b82f6 !important;
          }
          .bg-gradient-to-r {
            background: #10b981 !important;
            color: white !important;
          }
          .rounded-lg {
            border-radius: 4px !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
          }
          .text-2xl,
          .text-xl,
          .text-lg,
          .text-base {
            font-size: 14px !important;
          }
        }
      `}</style>

      <div className="mb-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Salary Slip Generator
            </h1>
            <p className="text-gray-600">
              Create and manage professional salary slips for employees
            </p>
          </div>
          <button
            onClick={() => navigate("/salary-reports")}
            className="mt-4 sm:mt-0 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>View Salary Reports</span>
          </button>
        </div>
      </div>

      {/* Employee Info Display Bar */}
      {formData.employeeId && (
        <div className="mb-6 no-print">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              {/* Left side - Employee name */}
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-800">
                  {employees.find(emp => emp.id === formData.employeeId)?.name || 'Employee'}
                </span>
              </div>

              {/* Center - Items display */}
              <div className="flex items-center space-x-6">
                {/* Advance - Show remaining amount */}
                {parseFloat(formData.remainingAdvanceAmount) > 0 && (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Advance:</span>
                    <span className="font-bold text-red-600">₹{parseFloat(formData.remainingAdvanceAmount || 0).toLocaleString()}</span>
                  </div>
                )}

                {/* Shoes - Display Remaining Amount */}
                {(originalShoesAmount > 0 || parseFloat(formData.remainingShoesAmount || 0) > 0) && (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">Shoes:</span>
                    <span className="font-bold text-red-600">₹{parseFloat(formData.remainingShoesAmount || 0).toLocaleString()}</span>
                  </div>
                )}

                {/* Uniform - Display Remaining Amount */}
                {(originalUniformAmount > 0 || parseFloat(formData.remainingUniformAmount || 0) > 0) && (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">Uniform:</span>
                    <span className="font-bold text-red-600">₹{parseFloat(formData.remainingUniformAmount || 0).toLocaleString()}</span>
                  </div>
                )}

              </div>

              {/* Right side - Others items */}
              <div className="flex items-center space-x-4">
                {(() => {
                  const otherItems = employeeIssuedItems.filter(item =>
                    !item.item.toLowerCase().includes('shoes') &&
                    !item.item.toLowerCase().includes('shoe') &&
                    !item.item.toLowerCase().includes('uniform')
                  );
                  const otherItemsCost = otherItems.reduce((total, item) => total + item.cost, 0);

                  return otherItemsCost > 0 ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium">Others:</span>
                      <span className="font-bold text-blue-600">₹{otherItemsCost}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}



      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-slide-down">
          <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 text-red-800 rounded-xl border-2 border-red-300 flex items-center shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-red-900">
                Error Generating Bill
              </h4>
              <p className="text-red-700 font-medium whitespace-pre-line">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-600 hover:text-red-800 transition-colors"
              title="Close"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 rounded-xl border border-green-200 flex items-center shadow-sm no-print">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-green-900">
              Salary Slip Generated Successfully!
            </h4>
            <p className="text-green-700 font-medium">
              Slip has been saved to the salary reports database and is ready for viewing.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 no-print">
        {/* Employee Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
            Employee Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee <span className="text-red-500">*</span>
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
                placeholder={employeesLoading ? "Loading employees..." : employees.length === 0 ? "No employees found" : "Search employee by name..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={employeesLoading || employees.length === 0}
              />

              {/* Dropdown suggestions */}
              {showEmployeeDropdown && filteredEmployees.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEmployeeSearchTerm(employee.name);
                        setShowEmployeeDropdown(false);
                        handleEmployeeSelect({ target: { value: employee.id, name: 'employeeId' } });
                      }}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      {employee.phone && (
                        <div className="text-sm text-gray-500">{employee.phone}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showEmployeeDropdown && employeeSearchTerm && filteredEmployees.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No employees found for "{employeeSearchTerm}"
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name
              </label>
              <input
                type="text"
                value={formData.employeeName}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Company <span className="text-red-500">*</span>
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Company</option>
                {(() => {
                  try {
                    return getCompanyOptions().map((company) => (
                      <option key={company.value} value={company.value}>
                        {company.label}
                      </option>
                    ));
                  } catch (error) {
                    console.error("Error loading company options:", error);
                    return <option value="">Error loading companies</option>;
                  }
                })()}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Details
              </label>
              <input
                type="text"
                value={(() => {
                  try {
                    return formData.companyId ? getCompanyById(formData.companyId)?.fullName || '' : '';
                  } catch (error) {
                    console.error("Error loading company details:", error);
                    return '';
                  }
                })()}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
                placeholder="Company details will appear here"
              />
            </div>
          </div>

          {!employeesLoading && employees.length === 0 && (
            <div className="md:col-span-2 mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-700">
                  No employees found in the database. Please add employees in the{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/employees")}
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Employee Management
                  </button>{" "}
                  section first.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 📊 Summary Modal */}
        {isSummaryModalOpen && summaryData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <DocumentTextIcon className="h-7 w-7" />
                  Payment Summary
                </h2>
                <button
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Employee Info */}
              <div className="bg-gray-50 px-6 py-3 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee:</span>
                    <span className="ml-2 font-semibold text-gray-900">{summaryData.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Month:</span>
                    <span className="ml-2 font-semibold text-gray-900">{summaryData.month}/{summaryData.year}</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="p-6 overflow-auto max-h-[calc(90vh-250px)]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Company Name</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Shift Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Salary Rate</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Working Days</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.companies.map((comp, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900">{comp.companyName}</td>
                        <td className="px-4 py-3 text-center text-blue-600 font-medium">{comp.shiftTime}</td>
                        <td className="px-4 py-3 text-center text-purple-600 font-medium">
                          ₹{comp.shiftHours === 12 ? (summaryData.salary12Hours || '0') : (summaryData.salary8Hours || '0')}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{comp.totalDays}</td>
                        <td className="px-4 py-3 text-right">
                          {editingRowIndex === index ? (
                            // Edit mode - Show input field
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-green-600">₹</span>
                              <input
                                type="number"
                                value={comp.companySalary}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  // Update company salary in summaryData
                                  const updatedCompanies = [...summaryData.companies];
                                  updatedCompanies[index].companySalary = newValue;

                                  // Calculate new total
                                  const newTotal = updatedCompanies.reduce((sum, c) => sum + parseFloat(c.companySalary || 0), 0).toFixed(2);

                                  // Update summaryData
                                  setSummaryData({
                                    ...summaryData,
                                    companies: updatedCompanies,
                                    total: newTotal
                                  });

                                  // Update formData basicSalary
                                  setFormData(prev => ({
                                    ...prev,
                                    basicSalary: newTotal,
                                    totalBillingSalary: newTotal
                                  }));
                                }}
                                onBlur={() => setEditingRowIndex(null)}
                                autoFocus
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-green-600 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          ) : (
                            // View mode - Show text with click handler
                            <div
                              onClick={() => setEditingRowIndex(index)}
                              className="text-green-600 font-semibold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                            >
                              ₹{comp.companySalary}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan="4" className="px-4 py-3 text-right font-bold text-gray-900">GRAND TOTAL:</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
                        ₹{summaryData.companies.reduce((sum, comp) => sum + parseFloat(comp.companySalary || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Generate PDF
                    const doc = new jsPDF();

                    // Title
                    doc.setFontSize(18);
                    doc.setFont(undefined, 'bold');
                    doc.text('Payment Summary', 105, 20, { align: 'center' });

                    // Employee Info
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Employee: ${summaryData.employeeName}`, 20, 35);
                    doc.text(`Month: ${summaryData.month}/${summaryData.year}`, 20, 42);

                    // Table
                    const tableData = summaryData.companies.map(comp => [
                      comp.companyName,
                      comp.shiftTime,
                      `₹${comp.shiftHours === 12 ? (summaryData.salary12Hours || '0') : (summaryData.salary8Hours || '0')}`,
                      comp.totalDays.toString(),
                      `₹${comp.companySalary}`
                    ]);


                    autoTable(doc, {
                      startY: 50,
                      head: [['Company Name', 'Shift Time', 'Salary Rate', 'Working Days', 'Total']],
                      body: tableData,
                      foot: [['', '', '', 'GRAND TOTAL:', `₹${summaryData.companies.reduce((sum, comp) => sum + parseFloat(comp.companySalary || 0), 0).toFixed(2)}`]],
                      theme: 'grid',
                      styles: { fontSize: 10 },
                      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
                      footStyles: { fillColor: [229, 231, 235], textColor: 0, fontStyle: 'bold' }
                    });


                    // Save PDF
                    doc.save(`Salary_Summary_${summaryData.employeeName}_${summaryData.month}_${summaryData.year}.pdf`);
                  }}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Period */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Billing Period
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                min="2000"
                max="2100"
              />
            </div>
          </div>
        </div>



        {/* Earnings Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
            Earnings
          </h2>

          <div className="flex gap-3">
            {/* Basic Salary - Editable */}
            <div className="w-72 mr-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Basic Salary
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary || ""}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-3 py-3 sm:text-base border border-gray-300 rounded-lg font-medium bg-white"
                  placeholder="Enter basic salary"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Summary Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={async () => {
                  if (formData.billingBreakdown && formData.billingBreakdown.length > 0) {
                    // Fetch company shift hours for each company
                    const companiesRef = collection(db, "companies");
                    const enrichedData = [];

                    for (const comp of formData.billingBreakdown) {
                      try {
                        const q = query(companiesRef, where("companyId", "==", comp.companyId));
                        const snapshot = await getDocs(q);
                        let shiftTime = "8 Hours";
                        let shiftHours = 8;

                        if (!snapshot.empty) {
                          const companyData = snapshot.docs[0].data();
                          shiftTime = companyData.shiftHours || companyData.shift || "8 Hours";
                          shiftHours = parseInt(shiftTime) || 8;
                        }

                        enrichedData.push({
                          ...comp,
                          shiftTime: shiftTime,
                          shiftHours: shiftHours // Store numeric shift hours
                        });
                      } catch (error) {
                        console.error("Error fetching company shift:", error);
                        enrichedData.push({
                          ...comp,
                          shiftTime: "8 Hours",
                          shiftHours: 8
                        });
                      }
                    }

                    // Get employee shift-wise salary rates
                    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
                    const salary8Hours = selectedEmployee?.salary8Hours;
                    const salary12Hours = selectedEmployee?.salary12Hours;

                    // Validate employee has at least one salary assigned
                    if ((!salary8Hours || salary8Hours === 0) && (!salary12Hours || salary12Hours === 0)) {
                      alert('⚠️ Please assign shift salary to this employee first!\n\nEmployee: ' + (selectedEmployee?.name || 'Unknown') + '\n\nGo to Employee Form and set 8 Hours or 12 Hours Shift Payment.');
                      return;
                    }

                    // Calculate daily rates
                    const daily8HoursRate = salary8Hours ? parseFloat(salary8Hours) / 30 : 0;
                    const daily12HoursRate = salary12Hours ? parseFloat(salary12Hours) / 30 : 0;

                    console.log('🔍 Summary Modal Debug:');
                    console.log('Selected Employee:', selectedEmployee);
                    console.log('8 Hours Salary:', salary8Hours);
                    console.log('12 Hours Salary:', salary12Hours);
                    console.log('8 Hours Daily Rate:', daily8HoursRate.toFixed(2));
                    console.log('12 Hours Daily Rate:', daily12HoursRate.toFixed(2));

                    // Recalculate total using shift-wise rates
                    const recalculatedTotal = enrichedData.reduce((sum, comp) => {
                      const dailyRate = comp.shiftHours === 12 ? daily12HoursRate : daily8HoursRate;
                      return sum + (comp.totalDays * dailyRate);
                    }, 0);

                    setSummaryData({
                      companies: enrichedData,
                      total: recalculatedTotal.toFixed(2),
                      employeeName: formData.employeeName || 'N/A',
                      month: formData.month || 'N/A',
                      year: formData.year || 'N/A',
                      salary8Hours: salary8Hours, // Store both rates
                      salary12Hours: salary12Hours
                    });
                    setIsSummaryModalOpen(true);
                  } else {
                    alert('⚠️ No billing breakdown available.\n\nPlease select employee and month first.');
                  }
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Summary
              </button>
            </div>

            {/* Bonus and Incentives - Same Row */}
            <div className="flex gap-6 ml-12">
              <div className="w-72">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="bonus"
                    value={formData.bonus}
                    onChange={handleChange}
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-7 pr-3 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                    placeholder="0.00"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="w-72">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incentives
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="incentives"
                    value={formData.incentives}
                    onChange={handleChange}
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-7 pr-3 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                    placeholder="0.00"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Deductions Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-red-600" />
            Deductions
          </h2>


          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance Amount Deduction
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="advanceDeduction"
                  value={formData.advanceDeduction}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
              {parseFloat(formData.remainingAdvanceAmount || 0) === 0 && (
                <p className="mt-1 text-xs text-orange-600 font-medium">
                  ⚠️ No remaining
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EPFO
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="epfo"
                  value={formData.epfo}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PF (Provident Fund)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="pf"
                  value={formData.pf}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ESIC
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="esic"
                  value={formData.esic}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uniform Deduction
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="uniform"
                  value={formData.uniform}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
              {parseFloat(formData.remainingUniformAmount || 0) === 0 && (
                <p className="mt-1 text-xs text-orange-600 font-medium">
                  ⚠️ No remaining
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shoes Deduction
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="shoes"
                  value={formData.shoes}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
              {parseFloat(formData.remainingShoesAmount || 0) === 0 && (
                <p className="mt-1 text-xs text-orange-600 font-medium">
                  ⚠️ No remaining
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Deductions
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="other"
                  value={formData.other}
                  onChange={handleChange}
                  className="focus:ring-red-500 focus:border-red-500 block w-full md:max-w-xs pl-7 pr-12 py-3 sm:text-base border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
            Payment Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Payment Status</option>
                <option value="payment_hold">Payment Hold</option>
                <option value="paid">Paid</option>
              </select>
              {!formData.status && (
                <p className="mt-1 text-sm text-red-600">
                  Please select payment status to generate salary slip
                </p>
              )}
            </div>
          </div>
        </div>



        {/* Payment Information */}
        <div className={`rounded-lg p-6 ${formData.status === 'paid' ? 'bg-green-50 border border-green-200' :
          formData.status === 'payment_hold' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900 mr-3">
                  Net Salary (Total Amount)
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${formData.status === 'paid' ? 'bg-green-100 text-green-800' :
                  formData.status === 'payment_hold' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                  {formData.status === 'paid' ? '✓ Paid' :
                    formData.status === 'payment_hold' ? '⏸ Payment Hold' :
                      '⏳ Pending'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {formData.status === 'paid' ? 'Payment completed to the employee' :
                  formData.status === 'payment_hold' ? 'Payment is on hold' :
                    'This amount will be paid to the employee'}
              </p>
            </div>
            <div className={`text-3xl font-bold ${formData.status === 'paid' ? 'text-green-600' :
              formData.status === 'payment_hold' ? 'text-red-600' :
                'text-blue-600'
              }`}>
              ₹{totalAmount}
            </div>
            {/* Salary source indicator */}
            <div className="text-xs text-gray-500 mt-1">
              {formData.basicSalary ?
                `Using manual basic salary: ₹${formData.basicSalary}` :
                formData.calculatedSalary ?
                  `Using calculated salary: ₹${formData.calculatedSalary}` :
                  'No basic salary set'
              }
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || employees.length === 0 || !formData.status}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Proce@ssing..." : !formData.status ? "Select Payment Status to Generate" : "Generate Slip"}
          </button>
        </div>
      </form>

      {/* Bill Display Modal - Keep your existing modal code */}
      {isBillModalOpen && generatedBill && (
        <div className="salary-slip-modal fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-1/2 shadow-2xl rounded-2xl bg-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 no-print">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancelBillModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="Close without saving"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Salary Slip Generated
                  </h3>
                  <p className="text-sm text-gray-600">
                    Professional salary slip created successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Simple PDF-like Salary Slip Format */}
            <div className="bill-content max-w-4xl mx-auto bg-white border border-gray-300 shadow-lg">

              {/* Header */}
              <div className="text-center py-4 border-b border-gray-300">
                {generatedBill.companyInfo ? (
                  <>
                    <h1 className="text-xl font-bold text-gray-900">{generatedBill.companyInfo.fullName}</h1>
                    <p className="text-sm text-gray-600 mt-1">{generatedBill.companyInfo.address}</p>
                    <p className="text-sm text-gray-600">Phone: {generatedBill.companyInfo.phone} | Email: {generatedBill.companyInfo.email}</p>
                  </>
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">Salary Slip Format</h1>
                )}
              </div>

              {/* Employee Information Section */}
              <div className="bg-blue-100 px-6 py-3 border-b border-gray-300">
                <h3 className="text-center font-semibold text-gray-800">Employee Information</h3>
              </div>

              <div className="px-6 py-4 space-y-2 border-b border-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div><strong>Employee Name:</strong> {generatedBill.employeeName}</div>
                    <div><strong>Month:</strong> {generatedBill.monthName} {generatedBill.year}</div>
                    <div><strong>Payment Date:</strong> {generatedBill.paymentDate ? new Date(generatedBill.paymentDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>ESI No:</strong> {(() => {
                      const employeeForESI = employees.find(emp => emp.id === formData.employeeId);
                      return employeeForESI?.esiNumber || employeeForESI?.esiNo || 'N/A';
                    })()}</div>
                  </div>
                  <div className="space-y-2">
                    <div><strong>Bank Name:</strong> {(() => {
                      const employeeForDisplay = employees.find(emp => emp.id === formData.employeeId);
                      return employeeForDisplay?.bankName || generatedBill.employeeBankDetails?.bankName || 'N/A';
                    })()}</div>
                    <div><strong>Account Number:</strong> {(() => {
                      const employeeForAccount = employees.find(emp => emp.id === formData.employeeId);
                      return employeeForAccount?.bankAccount || generatedBill.employeeBankDetails?.accountNumber || 'N/A';
                    })()}</div>
                    <div><strong>IFSC Code:</strong> {(() => {
                      const employeeForIFSC = employees.find(emp => emp.id === formData.employeeId);
                      return employeeForIFSC?.bankIFSC || generatedBill.employeeBankDetails?.ifscCode || 'N/A';
                    })()}</div>
                    <div><strong>PF Number:</strong> {(() => {
                      const employeeForPF = employees.find(emp => emp.id === formData.employeeId);
                      return employeeForPF?.pfNumber || employeeForPF?.pfNo || 'N/A';
                    })()}</div>
                  </div>
                </div>
              </div>

              {/* Salary Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Earnings</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Deductions</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Basic</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.basicSalary || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2">Advance Salary</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.advanceDeduction || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">HRA</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹0</td>
                      <td className="border border-gray-300 px-4 py-2">EPFO</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.epfo || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Bonus</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.bonus || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2">ESFC</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.esic || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Gross Salary</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{(parseFloat(generatedBill.basicSalary || 0) + parseFloat(generatedBill.bonus || 0)).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2">Provide Fund</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.pf || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Incentives</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.incentives || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2">Shoes</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.shoes || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2"></td>
                      <td className="border border-gray-300 px-4 py-2 text-right"></td>
                      <td className="border border-gray-300 px-4 py-2">Uniform</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.uniform || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2"></td>
                      <td className="border border-gray-300 px-4 py-2 text-right"></td>
                      <td className="border border-gray-300 px-4 py-2">Other Deduction</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">₹{parseFloat(generatedBill.other || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2"></td>
                      <td className="border border-gray-300 px-4 py-2 text-right"></td>
                      <td className="border border-gray-300 px-4 py-2"></td>
                      <td className="border border-gray-300 px-4 py-2 text-right"></td>
                    </tr>
                    <tr className="bg-blue-100 font-semibold">
                      <td className="border border-gray-300 px-4 py-3">Total Earnings</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">₹{(parseFloat(generatedBill.basicSalary || 0) + parseFloat(generatedBill.bonus || 0) + parseFloat(generatedBill.incentives || 0)).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3">Total Deductions</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">₹{(parseFloat(generatedBill.advanceDeduction || 0) + parseFloat(generatedBill.pf || 0) + parseFloat(generatedBill.epfo || 0) + parseFloat(generatedBill.esic || 0) + parseFloat(generatedBill.uniform || 0) + parseFloat(generatedBill.shoes || 0) + parseFloat(generatedBill.other || 0)).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Pay Section */}
              <div className="bg-blue-100 px-6 py-4 border-t border-gray-300">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    Net Pay: ₹{(() => {
                      const totalEarnings = parseFloat(generatedBill.basicSalary || 0) + parseFloat(generatedBill.bonus || 0) + parseFloat(generatedBill.incentives || 0);
                      const totalDeductions = parseFloat(generatedBill.advanceDeduction || 0) + parseFloat(generatedBill.pf || 0) + parseFloat(generatedBill.epfo || 0) + parseFloat(generatedBill.esic || 0) + parseFloat(generatedBill.uniform || 0) + parseFloat(generatedBill.shoes || 0) + parseFloat(generatedBill.other || 0);
                      const netPay = Math.max(0, totalEarnings - totalDeductions);
                      return netPay.toFixed(2);
                    })()}
                  </h3>
                  <p className="text-sm font-medium text-gray-700">
                    In Words: {(() => {
                      const totalEarnings = parseFloat(generatedBill.basicSalary || 0) + parseFloat(generatedBill.bonus || 0) + parseFloat(generatedBill.incentives || 0);
                      const totalDeductions = parseFloat(generatedBill.advanceDeduction || 0) + parseFloat(generatedBill.pf || 0) + parseFloat(generatedBill.epfo || 0) + parseFloat(generatedBill.esic || 0) + parseFloat(generatedBill.uniform || 0) + parseFloat(generatedBill.shoes || 0) + parseFloat(generatedBill.other || 0);
                      const netPay = Math.max(0, totalEarnings - totalDeductions);
                      return convertNumberToWords(Math.floor(netPay));
                    })()} Rupees Only
                  </p>
                </div>
              </div>

              {/* Show Deductions Checkbox */}
              <div className="mt-3 no-print bg-blue-200 px-4 py-4 m-3">
                <label className="flex items-center justify-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDeductions}
                    onChange={(e) => {
                      console.log("🔘 Show Deductions toggled:", e.target.checked);
                      console.log("📊 advanceTracking:", generatedBill?.advanceTracking);
                      console.log("📋 deductionHistory:", generatedBill?.advanceTracking?.deductionHistory);
                      setShowDeductions(e.target.checked);
                    }}
                    className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Show Deduction Details</span>
                </label>
              </div>

              {/* Deduction Details Section - Shown when checkbox is selected - PRINTS & DOWNLOADS */}
              {showDeductions && generatedBill.advanceTracking && (
                <div className="border-t border-gray-300 px-6 py-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Advance Salary Deduction Details</h4>

                  {/* Summary - Only show if there's advance data */}
                  {generatedBill.advanceTracking.originalAmount > 0 && (
                    <div className="bg-white p-4 rounded border border-gray-300 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Original Amount:</span>
                          <p className="font-semibold text-gray-900">₹{generatedBill.advanceTracking.originalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Deduction:</span>
                          <p className="font-semibold text-red-600">₹{generatedBill.advanceTracking.currentDeduction.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Remaining Amount:</span>
                          <p className="font-semibold text-orange-600">₹{generatedBill.advanceTracking.remainingAfterDeduction.toFixed(2)}</p>
                        </div>
                      </div>
                      {generatedBill.advanceTracking.previousDeductions > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                          <span>Total Previously Deducted: ₹{generatedBill.advanceTracking.previousDeductions.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Month-wise Deduction History - Always show if history exists */}
                  {generatedBill.advanceTracking.deductionHistory && generatedBill.advanceTracking.deductionHistory.length > 0 ? (
                    <div className="bg-white p-4 rounded border border-gray-300">
                      <h5 className="font-semibold text-gray-800 mb-3">Month-wise Deduction History</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Month</th>
                              <th className="border border-gray-300 px-3 py-2 text-right">Amount Deducted</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generatedBill.advanceTracking.deductionHistory.map((history, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                <td className="border border-gray-300 px-3 py-2">{history.month} {history.year}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-red-600">₹{parseFloat(history.advance || 0).toFixed(2)}</td>
                                <td className="border border-gray-300 px-3 py-2">{history.date ? new Date(history.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded border border-gray-300 text-center text-gray-500">
                      <p className="text-lg font-semibold">No Data Found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signature Section */}
              <div className="border-t border-gray-300">
                {/* Header Row */}
                <div className="grid grid-cols-2 bg-blue-100 border-b border-gray-300">
                  <div className="border-r border-gray-300 px-6 py-3">
                    <strong>Prepared by :</strong>
                  </div>
                  <div className="px-6 py-3">
                    <strong>Received by :</strong>
                  </div>
                </div>

                {/* Content Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 px-6 py-8">
                    <div className="text-center">
                      {/* Dropdown for screen */}
                      <select
                        value={preparedBy}
                        onChange={(e) => setPreparedBy(e.target.value)}
                        className="w-full px-3 py-2 border-b-2 border-gray-400 text-center focus:outline-none focus:border-blue-500 no-print"
                        required
                      >
                        <option value="">Select Supervisor</option>
                        {supervisors.map(sup => (
                          <option key={sup.id} value={sup.name}>
                            {sup.name} {sup.designation ? `- ${sup.designation}` : ''}
                          </option>
                        ))}
                      </select>
                      {/* Name for print */}
                      <div className="print-only border-t border-gray-400 pt-2 mt-12">
                        {preparedBy}
                      </div>
                      {/* Name display on screen */}
                      <div className="no-print mt-4 font-semibold text-gray-800">
                        {preparedBy}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-8">
                    <div className="text-center">
                      {/* Name for print */}
                      <div className="print-only border-t border-gray-400 pt-2 mt-12">
                        {generatedBill?.receivedBy || generatedBill?.employeeName || ''}
                      </div>
                      {/* Name display on screen */}
                      <div className="no-print mt-4 font-semibold text-gray-800">
                        {generatedBill?.receivedBy || generatedBill?.employeeName || ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="py-6 bg-gray-50 border-t border-gray-300 no-print">
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handlePrintBill}
                    disabled={!preparedBy.trim()}
                    className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors shadow-md ${preparedBy.trim()
                      ? 'bg-gray-600 hover:bg-gray-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title={!preparedBy.trim() ? 'Please enter Prepared By name' : 'Print slip'}
                  >
                    <PrinterIcon className="h-5 w-5 mr-2" />
                    Print
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!preparedBy.trim()}
                    className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors shadow-md ${preparedBy.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title={!preparedBy.trim() ? 'Please enter Prepared By name' : 'Download PDF'}
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={handleEditBill}
                    className="flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors shadow-md"
                  >
                    <PencilIcon className="h-5 w-5 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleCloseBillModal}
                    disabled={!preparedBy.trim()}
                    className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors shadow-md ${preparedBy.trim()
                      ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title={!preparedBy.trim() ? 'Please enter Prepared By name' : 'Close and save'}
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={5000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default SalaryBilling;