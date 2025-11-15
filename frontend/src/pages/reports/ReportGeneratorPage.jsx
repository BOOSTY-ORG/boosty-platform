import React from 'react';
import { Card } from '../../components/common';

const ReportGeneratorPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Report Generator</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generate Custom Reports</h2>
          <p className="text-gray-600">
            Create customized reports with specific parameters and data filters.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ReportGeneratorPage;