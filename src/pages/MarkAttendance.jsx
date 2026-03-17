import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, setDoc, doc, getDocs } from "firebase/firestore";

const MarkAttendance = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [companyEmployees, setCompanyEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [mode, setMode] = useState("daily");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [weekStart, setWeekStart] = useState("");
    const [weekEnd, setWeekEnd] = useState("");
    const [month, setMonth] = useState("");
    const [inTime, setInTime] = useState("");
    const [outTime, setOutTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchCompanies();
        fetchAllEmployees();
    }, []);

    useEffect(() => {
        if (selectedCompany && allEmployees.length > 0) {
            console.log("Selected Company:", selectedCompany);
            console.log("Total Employees:", allEmployees.length);

            const filtered = allEmployees.filter((emp) => {
                // Check multiple possible field names for company
                const empCompany = emp.companyId || emp.company || emp.companyID || emp.Company;
                const match = empCompany === selectedCompany;
                return match;
            });

            console.log("Filtered Employees:", filtered.length);
            if (allEmployees.length > 0) {
                console.log("Sample Employee Structure:", allEmployees[0]);
            }

            setCompanyEmployees(filtered);
            setSelectedEmployees((prev) =>
                prev.filter((empId) => filtered.some((emp) => emp.id === empId))
            );
        } else {
            setCompanyEmployees([]);
        }
    }, [selectedCompany, allEmployees]);

    const fetchCompanies = async () => {
        try {
            const snap = await getDocs(collection(db, "companies"));
            setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching companies:", err);
        }
    };

    const fetchAllEmployees = async () => {
        try {
            const snap = await getDocs(collection(db, "employees"));
            const employees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            console.log("Fetched Employees:", employees.length);
            setAllEmployees(employees);
        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    const handleEmployeeToggle = (employeeId) => {
        setSelectedEmployees((prev) =>
            prev.includes(employeeId)
                ? prev.filter((id) => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const calculateWorkingHours = (inTime, outTime) => {
        if (!inTime || !outTime) return { totalWorkingHours: 0, workingHoursFormatted: "" };

        const [inHours, inMinutes] = inTime.split(":").map(Number);
        const [outHours, outMinutes] = outTime.split(":").map(Number);

        const inTotalMinutes = inHours * 60 + inMinutes;
        const outTotalMinutes = outHours * 60 + outMinutes;

        let diffMinutes = outTotalMinutes - inTotalMinutes;
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }

        const totalWorkingHours = Number((diffMinutes / 60).toFixed(2));
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        const workingHoursFormatted = `${hours}h ${minutes}m`;

        return { totalWorkingHours, workingHoursFormatted };
    };

    const getDateRange = () => {
        if (mode === "daily") {
            return [date];
        } else if (mode === "weekly") {
            if (!weekStart || !weekEnd) return [];
            const dates = [];
            const start = new Date(weekStart);
            const end = new Date(weekEnd);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().split("T")[0]);
            }
            return dates;
        } else if (mode === "monthly") {
            if (!month) return [];
            const [year, monthNum] = month.split("-");
            const daysInMonth = new Date(year, monthNum, 0).getDate();
            const dates = [];
            for (let day = 1; day <= daysInMonth; day++) {
                dates.push(`${year}-${monthNum}-${String(day).padStart(2, "0")}`);
            }
            return dates;
        }
        return [];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCompany) {
            alert("कृपया Company निवडा");
            return;
        }

        if (selectedEmployees.length === 0) {
            alert("कृपया किमान एक Employee निवडा");
            return;
        }

        if (!inTime) {
            alert("कृपया In Time भरा");
            return;
        }

        const dates = getDateRange();
        if (dates.length === 0) {
            alert("कृपया योग्य date/week/month निवडा");
            return;
        }

        const confirmMsg = `${selectedEmployees.length} employees साठी ${dates.length} days ची attendance mark करायची?\n\nTotal records: ${selectedEmployees.length * dates.length}`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setLoading(true);

        try {
            const { totalWorkingHours, workingHoursFormatted } = calculateWorkingHours(inTime, outTime);
            let savedCount = 0;
            let skippedCount = 0;

            const companyData = companies.find((c) => c.id === selectedCompany);
            const companyName = companyData?.name || companyData?.companyName || "";

            for (const employeeId of selectedEmployees) {
                const employeeData = allEmployees.find((e) => e.id === employeeId);
                const employeeName = employeeData?.name || employeeData?.employeeName || "";

                for (const currentDate of dates) {
                    const docId = `${employeeId}_${currentDate}`;

                    const attendanceSnap = await getDocs(collection(db, "attendance"));
                    const existingAttendance = attendanceSnap.docs
                        .map((doc) => doc.data())
                        .find((record) => record.employeeName === employeeName && record.date === currentDate);

                    if (existingAttendance) {
                        skippedCount++;
                        continue;
                    }

                    await setDoc(doc(db, "attendance", docId), {
                        attendanceId: docId,
                        employeeId: employeeId,
                        employeeName: employeeName,
                        companyId: selectedCompany,
                        companyName: companyName,
                        date: currentDate,
                        inTime: inTime,
                        outTime: outTime || "",
                        status: "present",
                        totalWorkingHours: totalWorkingHours,
                        workingHoursFormatted: workingHoursFormatted,
                        timestamp: new Date().toISOString(),
                    });

                    savedCount++;
                }
            }

            alert(`✅ हजेरी यशस्वीरित्या नोंदवली!\n\n📊 Summary:\n✓ Saved: ${savedCount} records\n⊘ Skipped: ${skippedCount} records (already exist)`);

            setInTime("");
            setOutTime("");
            if (mode === "daily") {
                setDate(new Date().toISOString().split("T")[0]);
            } else if (mode === "weekly") {
                setWeekStart("");
                setWeekEnd("");
            } else if (mode === "monthly") {
                setMonth("");
            }
        } catch (err) {
            console.error("Error:", err);
            alert("❌ त्रुटी झाली: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mark Attendance</h2>
                    <p className="text-sm text-gray-600 mt-1">Bulk attendance marking for employees</p>
                </div>
                <button
                    onClick={() => navigate("/attendance")}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
                >
                    ← Back to Report
                </button>
            </div>

            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 Attendance Mode
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "daily", label: "📆 Daily" },
                                { value: "weekly", label: "📅 Weekly" },
                                { value: "monthly", label: "🗓️ Monthly" }
                            ].map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setMode(m.value)}
                                    className={`px-4 py-2 rounded font-medium ${mode === m.value
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Selection */}
                    {mode === "daily" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📆 Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border rounded"
                                required
                            />
                        </div>
                    )}

                    {mode === "weekly" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Week Start <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={weekStart}
                                    onChange={(e) => setWeekStart(e.target.value)}
                                    className="w-full px-4 py-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Week End <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={weekEnd}
                                    onChange={(e) => setWeekEnd(e.target.value)}
                                    className="w-full px-4 py-2 border rounded"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {mode === "monthly" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🗓️ Month <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="w-full px-4 py-2 border rounded"
                                required
                            />
                        </div>
                    )}

                    {/* Company Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🏢 Company <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className="w-full px-4 py-2 border rounded"
                            required
                        >
                            <option value="">-- Select Company --</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name || c.companyName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Employee Multi-Select Dropdown */}
                    {selectedCompany && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    👥 Select Employees <span className="text-red-500">*</span>
                                    {selectedEmployees.length > 0 && (
                                        <span className="ml-2 text-blue-600">({selectedEmployees.length} selected)</span>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        Showing {companyEmployees.length} of {allEmployees.length} total employees
                                    </div>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEmployees([])}
                                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                    >
                                        ✕ Clear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCompanyEmployees(allEmployees)}
                                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                        title="Show all employees from all companies"
                                    >
                                        Show All
                                    </button>
                                </div>
                            </div>

                            {companyEmployees.length > 0 ? (
                                <>
                                    {/* Search Box */}
                                    <div className="mb-2">
                                        <input
                                            type="text"
                                            placeholder="🔍 Search employees by name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onClick={() => {
                                                setCompanyEmployees(allEmployees);
                                                setShowDropdown(true);
                                            }}
                                            onDoubleClick={() => setShowDropdown(false)}
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>

                                    {/* Dropdown with Checkboxes - Show only when showDropdown is true */}
                                    {showDropdown && (
                                        <div className="border-2 border-gray-300 rounded-md bg-white max-h-64 overflow-y-auto mb-2">
                                            {companyEmployees
                                                .filter((emp) => {
                                                    const name = (emp.name || emp.employeeName || "").toLowerCase();
                                                    return name.includes(searchQuery.toLowerCase());
                                                })
                                                .map((emp) => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => handleEmployeeToggle(emp.id)}
                                                        className={`px-4 py-3 cursor-pointer border-b last:border-b-0 hover:bg-blue-50 ${selectedEmployees.includes(emp.id) ? "bg-blue-100" : ""
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedEmployees.includes(emp.id)}
                                                                onChange={() => { }}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="flex-1">{emp.name || emp.employeeName}</span>
                                                            {selectedEmployees.includes(emp.id) && (
                                                                <span className="text-blue-600 font-bold">✓</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            {companyEmployees.filter((emp) => {
                                                const name = (emp.name || emp.employeeName || "").toLowerCase();
                                                return name.includes(searchQuery.toLowerCase());
                                            }).length === 0 && (
                                                    <div className="px-4 py-4 text-gray-500 text-center">
                                                        No employees found matching "{searchQuery}"
                                                    </div>
                                                )}
                                        </div>
                                    )}

                                    {/* Selected Tags */}
                                    {selectedEmployees.length > 0 && (
                                        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-md">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEmployees.map((empId) => {
                                                    const emp = allEmployees.find((e) => e.id === empId);
                                                    return (
                                                        <div
                                                            key={empId}
                                                            className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                                                        >
                                                            <span>{emp?.name || emp?.employeeName}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEmployeeToggle(empId);
                                                                }}
                                                                className="hover:bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-6 text-gray-500 bg-yellow-50 rounded border-2 border-yellow-200">
                                    <div className="text-2xl mb-2">⚠️</div>
                                    <div className="font-medium">या company मध्ये employees assign नाहीत</div>
                                    <div className="text-sm mt-1">
                                        कृपया Employees page वरून या company ला employees assign करा
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCompanyEmployees(allEmployees)}
                                        className="mt-3 text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        Show All {allEmployees.length} Employees
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🕐 In Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={inTime}
                                onChange={(e) => setInTime(e.target.value)}
                                className="w-full px-4 py-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🕐 Out Time
                            </label>
                            <input
                                type="time"
                                value={outTime}
                                onChange={(e) => setOutTime(e.target.value)}
                                className="w-full px-4 py-2 border rounded"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold disabled:bg-blue-300"
                        >
                            {loading ? "⏳ Saving..." : "✓ Mark Attendance"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/attendance")}
                            className="px-6 py-3 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MarkAttendance;
