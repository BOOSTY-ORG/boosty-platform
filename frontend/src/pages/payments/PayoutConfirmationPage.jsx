import React from 'react';
import { Card } from '../../components/common';

const PayoutConfirmationPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payout Confirmation</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Confirm Payouts</h2>
          <p className="text-gray-600">
            Review and confirm pending payouts to investors and partners.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PayoutConfirmationPage;