import React from 'react';
import { Card } from '../../components/common';

const CRMPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Relationship Management</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">CRM Dashboard</h2>
          <p className="text-gray-600">
            Manage customer relationships, support tickets, and communications.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CRMPage;