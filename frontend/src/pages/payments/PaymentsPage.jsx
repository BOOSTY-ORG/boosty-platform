import React from 'react';
import { Card } from '../../components/common';

const PaymentsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Management</h2>
          <p className="text-gray-600">
            Manage and track all payment transactions, payouts, and financial records.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PaymentsPage;