import React from 'react';
import { Card } from '../../components/common';

const TransactionLedgerPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Transaction Ledger</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Financial Transactions</h2>
          <p className="text-gray-600">
            View and manage the complete transaction ledger with detailed financial records.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default TransactionLedgerPage;