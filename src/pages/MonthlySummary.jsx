// src/pages/MonthlySummary.jsx
import React, { useEffect, useState } from "react";
import { getMonthlySummary } from "../services/attendanceShiftService";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const MonthlySummary = () => {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // load companies once
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "companies"));
      setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  const fetchSummary = async () => {
    if (!companyId) return alert("Select company");
    setLoading(true);
    try {
      const { summaryArr, grandTotal } = await getMonthlySummary(companyId, Number(month), Number(year));
      setSummary(summaryArr);
      setGrandTotal(grandTotal);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Monthly Attendance Summary</h2>

      <div className="flex gap-4 mb-6 flex-wrap">
        <select className="border px-3 py-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">Select Company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.companyName}
            </option>
          ))}
        </select>

        <select className="border px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
          {[...Array(12)].map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {idx + 1}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="border px-3 py-2 w-24"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={fetchSummary}
          disabled={loading}
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      {summary.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border text-sm bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-3 py-2">Employee</th>
                <th className="border px-3 py-2">Full Days</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{row.employeeName}</td>
                  <td className="border px-3 py-2 text-center">{row.fullDays}</td>
                </tr>
              ))}
              <tr className="font-semibold bg-gray-100">
                <td className="border px-3 py-2">Grand Total</td>
                <td className="border px-3 py-2 text-center">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonthlySummary;
