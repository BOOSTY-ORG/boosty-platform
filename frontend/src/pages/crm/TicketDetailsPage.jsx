import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/common';

const TicketDetailsPage = () => {
  const { id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Ticket Details</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ticket ID: {id}</h2>
          <p className="text-gray-600">
            View and manage detailed information about this support ticket.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default TicketDetailsPage;