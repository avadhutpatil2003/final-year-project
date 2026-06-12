import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const AdvanceContext = createContext();

export const useAdvance = () => {
  const context = useContext(AdvanceContext);
  if (!context) {
    throw new Error("useAdvance must be used within an AdvanceProvider");
  }
  return context;
};

export const AdvanceProvider = ({ children }) => {
  // main state
  const [deductionData, setDeductionData] = useState(null);

  // update functions - memoized to prevent infinite loops
  const updateDeductionData = useCallback((data) => {
    setDeductionData(data);
  }, []);

  const clearDeductionData = useCallback(() => {
    setDeductionData(null);
  }, []);

  // Backward compatibility (same functions but old names)
  const updateAdvanceData = updateDeductionData;
  const clearAdvanceData = clearDeductionData;

  const value = useMemo(() => ({
    // primary
    deductionData,
    updateDeductionData,
    clearDeductionData,

    // backward compatibility names
    advanceData: deductionData,
    updateAdvanceData,
    clearAdvanceData,
  }), [deductionData, updateDeductionData, clearDeductionData, updateAdvanceData, clearAdvanceData]);

  return (
    <AdvanceContext.Provider value={value}>
      {children}
    </AdvanceContext.Provider>
  );
};
