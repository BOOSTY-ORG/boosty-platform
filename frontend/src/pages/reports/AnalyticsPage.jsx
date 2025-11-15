import React from 'react';
import { Card } from '../../components/common';

const AnalyticsPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Business Analytics</h2>
          <p className="text-gray-600">
            View detailed analytics and insights about business performance and metrics.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;