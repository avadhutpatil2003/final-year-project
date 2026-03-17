import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const BillingPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [salaryDetails, setSalaryDetails] = useState([]);
  const [totalSalary, setTotalSalary] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Load Employees from Firestore
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, "employees"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEmployees(list);
      } catch (e) {
        console.error("Error loading employees:", e);
        setError("Failed to load employees.");
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee && selectedMonth) calculateSalary();
  }, [selectedEmployee, selectedMonth]);

  const calculateSalary = async () => {
    setLoading(true);
    setError("");
    setSalaryDetails([]);
    setTotalSalary(0);

    try {
      // Step 1: Get Attendance Records
      const attRef = collection(db, "attendance");
      const q = query(attRef, where("employeeId", "==", selectedEmployee));
      const snap = await getDocs(q);
      const allRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (allRecords.length === 0) {
        setError("No attendance records found for this employee.");
        setLoading(false);
        return;
      }

      // Step 2: Filter by selected month (YYYY-MM)
      const filtered = allRecords.filter(
        (r) => typeof r.date === "string" && r.date.startsWith(selectedMonth)
      );

      if (filtered.length === 0) {
        setError(`No attendance found for ${selectedMonth}.`);
        setLoading(false);
        return;
      }

      // Step 3: Group by company
      const grouped = {};
      filtered.forEach((r) => {
        const comp = r.companyId || r.companyName?.trim() || "unknown";
        if (!grouped[comp]) grouped[comp] = [];
        grouped[comp].push(r);
      });

      let totalSalaryCalc = 0;
      let results = [];

      // 🕒 Helper: Get working hours per record
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

      // Step 4: Calculate company-wise totals
      for (const compId in grouped) {
        const recs = grouped[compId];
        let totalMinutes = 0;

        recs.forEach((r) => {
          totalMinutes += getWorkingHours(r) * 60;
        });

        const totalHours = totalMinutes / 60;
        const formatted = `${Math.floor(totalHours)}h ${Math.round(
          (totalHours % 1) * 60
        )}m`;

        // Step 5: Fetch company data from Firestore
        let companyName = "";
        let dayWiseSalary = 0;
        let hourlySalary = 0;

        const companySnap = await getDocs(
          query(
            collection(db, "companies"),
            where("companyId", "==", compId)
          )
        );

        if (!companySnap.empty) {
          const data = companySnap.docs[0].data();
          companyName = data.name || data.companyName || compId;
          dayWiseSalary = data.dayWiseSalary || 0;
          hourlySalary = data.hourlyRate || (dayWiseSalary ? dayWiseSalary / 8 : 0);
        } else {
          throw new Error(`❌ Company data not found for ${compId}`);
        }

        const companySalary = totalHours * hourlySalary;
        totalSalaryCalc += companySalary;

        results.push({
          companyId: compId,
          companyName,
          totalDays: recs.length,
          totalHours: formatted,
          totalHoursDecimal: totalHours.toFixed(2),
          hourlySalary: hourlySalary.toFixed(2),
          dayWiseSalary,
          companySalary: companySalary.toFixed(2),
        });
      }

      setSalaryDetails(results);
      setTotalSalary(totalSalaryCalc.toFixed(2));
    } catch (err) {
      console.error("💥 Salary calc error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Billing Page</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded mb-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Employee</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.employeeId || emp.id}>
              {emp.name || emp.employeeName}
            </option>
          ))}
        </select>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Calculating salary...</p>
      ) : (
        selectedEmployee &&
        selectedMonth &&
        salaryDetails.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Company-wise Salary Breakdown
            </h3>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Company</th>
                  <th className="p-2 border">Days Worked</th>
                  <th className="p-2 border">Total Hours</th>
                  <th className="p-2 border">Hourly Rate</th>
                  <th className="p-2 border">Day Rate</th>
                  <th className="p-2 border">Salary</th>
                </tr>
              </thead>
              <tbody>
                {salaryDetails.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{s.companyName}</td>
                    <td className="p-2 border text-center">{s.totalDays}</td>
                    <td className="p-2 border text-blue-600">{s.totalHours}</td>
                    <td className="p-2 border">₹{s.hourlySalary}/hr</td>
                    <td className="p-2 border">₹{s.dayWiseSalary}</td>
                    <td className="p-2 border text-green-600 font-bold">
                      ₹{s.companySalary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-xl font-bold text-gray-800">
              Grand Total Salary: ₹{totalSalary}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default BillingPage;
