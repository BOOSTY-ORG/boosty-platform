import React from 'react';
import { Card } from '../../components/common';

const ReportsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Report Dashboard</h2>
          <p className="text-gray-600">
            Generate and view various reports for business insights and analytics.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;