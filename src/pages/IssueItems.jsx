import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const IssueItems = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [issuedData, setIssuedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", cost: "" });
  const [itemsList, setItemsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [employeeItemCosts, setEmployeeItemCosts] = useState({});

  // Load employee-specific pricing when employee is selected
  useEffect(() => {
    const loadEmployeePricing = async () => {
      if (!selectedEmployee) {
        setEmployeeItemCosts({});
        return;
      }

      const emp = employees.find((e) => e.id === selectedEmployee);
      if (!emp) return;

      const empDocId = emp.name.replace(/\s+/g, "").toLowerCase();
      
      try {
        const empPricingRef = doc(db, "employeePricing", empDocId);
        const empPricingSnap = await getDoc(empPricingRef);
        
        if (empPricingSnap.exists()) {
          const pricingData = empPricingSnap.data();
          // Extract only item costs (exclude metadata)
          const itemCosts = {};
          Object.keys(pricingData).forEach(key => {
            if (key !== 'employeeId' && key !== 'employeeName' && key !== 'updatedDate') {
              itemCosts[key] = pricingData[key];
            }
          });
          setEmployeeItemCosts(itemCosts);
        } else {
          setEmployeeItemCosts({});
        }
      } catch (error) {
        console.log("No custom pricing found for employee");
        setEmployeeItemCosts({});
      }
    };

    loadEmployeePricing();
  }, [selectedEmployee, employees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.employee-search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 🔹 Load Employees from Firebase
  useEffect(() => {
    const employeesRef = collection(db, 'employees');
    let q;
    try {
      q = query(employeesRef, orderBy('createdAt', 'desc'));
    } catch {
      q = employeesRef;
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeeData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employeeData.push({
          id: doc.id,
          name: data.name,
          ...data,
        });
      });
      setEmployees(employeeData);
      setEmployeesLoading(false);
    });

    fetchItemsList();
    fetchIssuedData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Fetch issued items from Firestore
  const fetchIssuedData = async () => {
    const snapshot = await getDocs(collection(db, "issuedItems"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setIssuedData(data);
  };

  // 🔹 Initialize predefined items in database
  const initializePredefinedItems = async () => {
    const predefinedItems = [
      { name: "Shoes", cost: 500, isPredefined: true },
      { name: "Uniform", cost: 1500, isPredefined: true },
    ];

    for (const item of predefinedItems) {
      // Check if item already exists (by name, regardless of isPredefined flag)
      const existingItems = await getDocs(collection(db, "itemsList"));
      const existingItem = existingItems.docs.find(doc => 
        doc.data().name.toLowerCase() === item.name.toLowerCase()
      );

      if (!existingItem) {
        // Add predefined item to database
        await addDoc(collection(db, "itemsList"), {
          ...item,
          addedBy: "predefined",
          addedDate: new Date().toISOString().split("T")[0],
        });
        console.log(`Added predefined item: ${item.name}`);
      } else {
        // Update existing item cost and mark as predefined if not already
        const currentData = existingItem.data();
        await updateDoc(doc(db, "itemsList", existingItem.id), {
          cost: item.cost,
          isPredefined: true,
          addedBy: currentData.addedBy || "predefined",
          updatedDate: new Date().toISOString().split("T")[0],
        });
        console.log(`Updated predefined item: ${item.name} to cost ₹${item.cost}`);
      }
    }
  };

  // 🔹 Fetch all items (predefined + manually added)
  const fetchItemsList = async () => {
    // First ensure predefined items are in database
    await initializePredefinedItems();
    
    const snap = await getDocs(collection(db, "itemsList"));
    const firestoreItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    // Remove duplicates by keeping only the latest version of each item (by name)
    const uniqueItems = firestoreItems.reduce((acc, item) => {
      const existingIndex = acc.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());
      if (existingIndex === -1) {
        acc.push(item);
      } else {
        // Keep the item with the most recent update date, or replace if current is newer
        const existingItem = acc[existingIndex];
        if (!existingItem.updatedDate || (item.updatedDate && item.updatedDate > existingItem.updatedDate)) {
          acc[existingIndex] = item;
        }
      }
      return acc;
    }, []);
    
    // Show all unique items from database (including predefined)
    setItemsList(uniqueItems);
  };

  // 🔹 Check if item is already issued to selected employee
  const isItemAlreadyIssued = (itemName) => {
    if (!selectedEmployee) return false;
    
    const emp = employees.find((e) => e.id === selectedEmployee);
    if (!emp) return false;
    
    const empDocId = emp.name.replace(/\s+/g, "").toLowerCase();
    const issuedRecord = issuedData.find(record => record.id === empDocId);
    
    if (!issuedRecord || !issuedRecord.items) return false;
    
    return issuedRecord.items.some(issuedItem => issuedItem.item === itemName);
  };

  // 🔹 Confirm issue and save to Firestore
  const handleConfirmIssue = async () => {
    if (!selectedEmployee || selectedItems.length === 0) {
      alert("कृपया employee आणि किमान एक आयटम निवडा!");
      return;
    }

    setLoading(true);

    const emp = employees.find((e) => e.id === selectedEmployee);
    const empDocId = emp.name.replace(/\s+/g, "").toLowerCase(); // rohanjadhav

    const empDocRef = doc(db, "issuedItems", empDocId);
    const empDocSnap = await getDoc(empDocRef);

    // Use current/latest values from selectedItems
    const newItems = selectedItems.map((item) => {
      console.log(`Issuing ${item.name} to ${emp.name} with cost: ₹${item.cost}`);
      return {
        item: item.name,
        cost: item.cost,
        remaining: item.cost,
        issuedDate: new Date().toISOString().split("T")[0],
      };
    });

    console.log('Items being issued with current values:', newItems);

    if (empDocSnap.exists()) {
      await updateDoc(empDocRef, {
        items: [...empDocSnap.data().items, ...newItems],
      });
    } else {
      await setDoc(empDocRef, {
        employeeId: emp.id,
        employeeName: emp.name,
        items: newItems,
      });
    }

    await fetchIssuedData();
    setSelectedItems([]);
    setSelectedEmployee("");
    setSearchTerm("");
    setLoading(false);
    alert(`✅ ${emp.name} ला आयटम दिले गेले!`);
  };

  // 🔹 Add new manual item to Firestore
  const handleAddNewItem = async () => {
    if (!newItem.name || !newItem.cost) {
      alert("कृपया आयटम नाव आणि cost भरा!");
      return;
    }

    await addDoc(collection(db, "itemsList"), {
      name: newItem.name,
      cost: Number(newItem.cost),
      addedBy: "manual",
      addedDate: new Date().toISOString().split("T")[0],
    });

    alert(`✅ ${newItem.name} यशस्वीरित्या जोडले गेले!`);
    setNewItem({ name: "", cost: "" });
    setShowAddModal(false);
    fetchItemsList(); // refresh items
  };

  // 🔹 Handle edit item for specific employee
  const handleEditItem = (item) => {
    if (!selectedEmployee) {
      alert("कृपया प्रथम employee निवडा!");
      return;
    }
    setEditingItem(item);
    setShowEditModal(true);
  };

  // 🔹 Update item cost for specific employee only
  const handleUpdateItem = async () => {
    if (!editingItem.name || !editingItem.cost) {
      alert("कृपया आयटम नाव आणि cost भरा!");
      return;
    }

    if (!selectedEmployee) {
      alert("कृपया employee निवडा!");
      return;
    }

    try {
      const emp = employees.find((e) => e.id === selectedEmployee);
      const empDocId = emp.name.replace(/\s+/g, "").toLowerCase();
      
      // Store employee-specific pricing in a separate collection
      const empPricingRef = doc(db, "employeePricing", empDocId);
      
      // Update the specific item cost for this employee
      const newCost = Number(editingItem.cost);
      setEmployeeItemCosts(prev => ({
        ...prev,
        [editingItem.name]: newCost
      }));
      
      await setDoc(empPricingRef, {
        ...employeeItemCosts,
        [editingItem.name]: newCost,
        employeeId: emp.id,
        employeeName: emp.name,
        updatedDate: new Date().toISOString().split("T")[0],
      });

      // Update local selected items with new cost
      setSelectedItems(prevItems => 
        prevItems.map(item => 
          item.name === editingItem.name 
            ? { ...item, cost: newCost }
            : item
        )
      );

      alert(`✅ ${editingItem.name} ची किंमत ${emp.name} साठी अपडेट केली गेली!`);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating employee pricing:", error);
      alert("किंमत अपडेट करण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    }
  };

  // 🔹 Handle item selection with employee-specific cost
  const handleSelectItem = (item, isChecked) => {
    if (isChecked) {
      // Check if item is already selected
      const isAlreadySelected = selectedItems.some((i) => i.name === item.name);
      if (!isAlreadySelected) {
        // Get employee-specific cost or default cost
        const costForEmployee = employeeItemCosts[item.name] || item.cost;
        setSelectedItems((prev) => [...prev, { ...item, cost: costForEmployee }]);
      }
    } else {
      setSelectedItems((prev) => prev.filter((i) => i.name !== item.name));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🎟 Issue Employee Accessories</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          ➕ Add Item
        </button>
      </div>

      {/* Employee search */}
      <div className="mb-4 relative employee-search-container">
        <label className="font-semibold">Employee निवडा:</label>
        <input
          type="text"
          className="border p-2 rounded w-full mt-1"
          placeholder={employeesLoading ? "Loading employees..." : "Search employee by name..."}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            if (e.target.value === "") {
              setSelectedEmployee("");

            }
          }}
          onFocus={() => setShowDropdown(true)}
          disabled={employeesLoading}
        />
        
        {/* Dropdown list */}
        {showDropdown && !employeesLoading && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
            {employees
              .filter(employee => 
                employee.name.toLowerCase().startsWith(searchTerm.toLowerCase())
              )
              .map((employee) => (
                <div
                  key={employee.id}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100"
                  onClick={() => {
                    setSelectedEmployee(employee.id);
                    setSearchTerm(employee.name);
                    setShowDropdown(false);
                  }}
                >
                  {employee.name}
                </div>
              ))}
            {employees.filter(employee => 
              employee.name.toLowerCase().startsWith(searchTerm.toLowerCase())
            ).length === 0 && searchTerm && (
              <div className="px-4 py-2 text-gray-500">
                No employees found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}
        
        {employeesLoading && (
          <p className="text-sm text-gray-500 mt-1">Loading employee data...</p>
        )}
        {!employeesLoading && employees.length === 0 && (
          <p className="text-sm text-red-500 mt-1">No employees found. Please add employees first.</p>
        )}
      </div>

      {/* Items selection */}
      <h3 className="text-lg font-semibold mb-2">📦 Items:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {itemsList.map((item) => {
          const isAlreadyIssued = isItemAlreadyIssued(item.name);
          const isSelected = selectedItems.some((i) => i.name === item.name);
          const currentCost = employeeItemCosts[item.name] || item.cost;
          const hasCustomCost = employeeItemCosts[item.name] && employeeItemCosts[item.name] !== item.cost;
          
          return (
            <div
              key={item.id}
              className={`border rounded-lg p-3 ${
                isAlreadyIssued 
                  ? 'bg-gray-100 border-gray-300 opacity-60' 
                  : isSelected 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={isSelected}
                    disabled={isAlreadyIssued}
                    onChange={(e) => handleSelectItem(item, e.target.checked)}
                  />
                  <span className={`${isAlreadyIssued ? 'text-gray-500' : ''}`}>
                    {item.name} - ₹{currentCost}
                    {hasCustomCost && (
                      <span className="ml-2 text-xs text-green-600 font-medium">
                        (Custom Price)
                      </span>
                    )}
                    {isAlreadyIssued && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        (Already Issued)
                      </span>
                    )}
                  </span>
                </label>
              </div>
              
              {/* Edit button for all items */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditItem(item)}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={!selectedEmployee}
                >
                  ✏️ Edit Cost
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirmIssue}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        {loading ? "Processing..." : "✅ Confirm Issue"}
      </button>

      {/* Issued items table */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3">📋 Issued Items</h2>
        <table className="w-full border border-gray-300 rounded-lg">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 text-left">Employee Name</th>
              <th className="p-2 text-left">Issued Items</th>
              <th className="p-2 text-left">Original Cost (₹)</th>
              <th className="p-2 text-left">Remaining (₹)</th>
              <th className="p-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {issuedData.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-semibold">{emp.employeeName}</td>
                <td className="p-2">
                  {emp.items.map((i) => (
                    <div key={i.item}>• {i.item}</div>
                  ))}
                </td>
                <td className="p-2">
                  {emp.items.map((i) => (
                    <div key={i.item}>₹{i.cost}</div>
                  ))}
                </td>
                <td className="p-2">
                  {emp.items.map((i) => (
                    <div key={i.item}>₹{i.remaining}</div>
                  ))}
                </td>
                <td className="p-2">
                  {emp.items.map((i) => (
                    <div key={i.item}>{i.issuedDate}</div>
                  ))}
                </td>
              </tr>
            ))}
            {issuedData.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No issued items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add Item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">➕ Add New Item</h2>
            <input
              type="text"
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, name: e.target.value }))
              }
              className="border w-full p-2 mb-3 rounded"
            />
            <input
              type="number"
              placeholder="Cost (₹)"
              value={newItem.cost}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, cost: e.target.value }))
              }
              className="border w-full p-2 mb-3 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewItem}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Edit Item */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">✏️ Edit Item Cost</h2>
            <input
              type="text"
              placeholder="Item Name"
              value={editingItem.name}
              onChange={(e) =>
                setEditingItem((prev) => ({ ...prev, name: e.target.value }))
              }
              className="border w-full p-2 mb-3 rounded bg-gray-100"
              disabled
            />
            <input
              type="number"
              placeholder="Cost (₹)"
              value={editingItem.cost}
              onChange={(e) =>
                setEditingItem((prev) => ({ ...prev, cost: e.target.value }))
              }
              className="border w-full p-2 mb-3 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateItem}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueItems;
