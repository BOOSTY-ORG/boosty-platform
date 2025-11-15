import React from 'react';
import { Card } from '../../components/common';

const TicketListPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Support Tickets</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ticket Management</h2>
          <p className="text-gray-600">
            View and manage all customer support tickets and requests.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default TicketListPage;