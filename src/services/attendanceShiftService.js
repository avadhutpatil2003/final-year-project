// src/services/attendanceShiftService.js
// Production-ready helper for shift-aware attendance saving & summary generation

import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * Parse a time string "HH:MM AM/PM" → float hours
 */
const parseTimeToHours = (timeStr) => {
  if (!timeStr) return null;
  const [time, period] = timeStr.trim().split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period?.toUpperCase() === "AM" && h === 12) h = 0;
  return h + m / 60;
};

/**
 * Calculate working hours from in/out time strings
 */
const calculateHours = (inTime, outTime) => {
  const inH = parseTimeToHours(inTime);
  const outH = parseTimeToHours(outTime);
  if (inH === null || outH === null) return 0;
  // handle overnight
  let diff = outH - inH;
  if (diff < 0) diff += 24;
  return Number(diff.toFixed(2));
};

/**
 * Determine calculatedDay value based on company shiftHours
 */
const computeCalculatedDay = (workedHours, shiftHours) => {
  if (workedHours < shiftHours) return 0;
  if (workedHours === shiftHours) return 1;
  return 1.5;
};

/**
 * Save attendance with shift-based calculatedDay & shiftHours fields
 *
 * @param {Object} params – { employeeId, date (YYYY-MM-DD), inTime, outTime, additionalData }
 */
export const saveAttendanceWithShift = async ({
  employeeId,
  date,
  inTime,
  outTime,
  ...rest
}) => {
  if (!employeeId) throw new Error("employeeId missing");
  if (!date) throw new Error("date missing");

  // 1️⃣ Fetch employee to know companyId
  const empSnap = await getDoc(doc(db, "employees", employeeId));
  if (!empSnap.exists()) throw new Error("Employee not found");
  const empData = empSnap.data();
  const companyId = empData.companyId;
  if (!companyId) throw new Error("Employee missing companyId");

  // 2️⃣ Fetch company to know shiftHours
  const compSnap = await getDoc(doc(db, "companies", companyId));
  const shiftHours = compSnap.exists() ? Number(compSnap.data().shiftHours) || 8 : 8; // default 8 if missing

  // 3️⃣ Calculate worked hours & calculatedDay
  const hours = calculateHours(inTime, outTime);
  const calculatedDay = computeCalculatedDay(hours, shiftHours);

  // 4️⃣ Save attendance record
  const attendanceData = {
    employeeId,
    employeeName: empData.name || empData.employeeName || "", // convenience
    companyId,
    companyName: compSnap.exists() ? compSnap.data().name || compSnap.data().companyName : "",
    date,
    inTime,
    outTime,
    hours,
    shiftHours,
    calculatedDay,
    ...rest,
    createdAt: new Date(),
  };

  await addDoc(collection(db, "attendance"), attendanceData);
  return attendanceData;
};

/**
 * Build monthly attendance summary (full days) for a company
 * @param {String} companyId
 * @param {Number} month 1-12
 * @param {Number} year YYYY
 * @returns {Array} [{ employeeId, employeeName, fullDays }]
 */
export const getMonthlySummary = async (companyId, month, year) => {
  if (!companyId) throw new Error("companyId required");
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day prev monthIndex+1
  const startISO = start.toISOString().split("T")[0];
  const endISO = end.toISOString().split("T")[0];

  // Fetch attendance for company & date range
  const attRef = collection(db, "attendance");
  const q = query(attRef, where("companyId", "==", companyId));
  const snap = await getDocs(q);
  const records = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.date >= startISO && r.date <= endISO);

  // Group & sum
  const group = {};
  for (const rec of records) {
    const key = rec.employeeId;
    if (!group[key]) {
      group[key] = {
        employeeId: key,
        employeeName: rec.employeeName || "Unknown",
        totalCalculated: 0,
      };
    }
    group[key].totalCalculated += Number(rec.calculatedDay) || 0;
  }

  // Convert summed values to full days via Math.ceil
  const summaryArr = Object.values(group).map((g) => ({
    employeeId: g.employeeId,
    employeeName: g.employeeName,
    fullDays: Math.ceil(g.totalCalculated),
  }));

  // Grand total
  const grandTotal = summaryArr.reduce((acc, cur) => acc + cur.fullDays, 0);

  return { summaryArr, grandTotal };
};
