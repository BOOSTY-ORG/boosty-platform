import React from 'react';
import { FinanceProvider } from '../../context/FinanceContext.jsx';
import FinancialDashboard from '../../components/finance/FinancialDashboard.jsx';

const FinancePage = () => {
  return (
    <FinanceProvider>
      <div className="container mx-auto px-4 py-8">
        <FinancialDashboard />
      </div>
    </FinanceProvider>
  );
};

export default FinancePage;