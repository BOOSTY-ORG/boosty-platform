import React from 'react';
import { Card } from '../../components/common';

const CommunicationHistoryPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Communication History</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Communications</h2>
          <p className="text-gray-600">
            View the complete history of communications with customers and stakeholders.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CommunicationHistoryPage;