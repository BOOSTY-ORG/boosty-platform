import React, { useState, useEffect } from 'react';
import { Card, Table } from '../../components/common';
import { useAccess } from '../../context/AccessContext.jsx';
import { HeaderAccessIndicator, ActionAccessIndicator, AccessGuard, TableAccessIndicator } from '../../components/access-indicators';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const PaymentsPage = () => {
  const { userLevel, canViewPayments, canProcessPayments, canRefundPayments } = useAccess();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mock payment data
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPayments([
        {
          id: 'pay_1234567890',
          userId: 'user_123',
          userName: 'John Doe',
          amount: 1500.00,
          currency: 'USD',
          status: 'completed',
          type: 'investment',
          date: '2023-11-15T10:30:00Z',
          description: 'Solar panel investment'
        },
        {
          id: 'pay_1234567891',
          userId: 'user_456',
          userName: 'Jane Smith',
          amount: 750.50,
          currency: 'USD',
          status: 'pending',
          type: 'maintenance',
          date: '2023-11-14T14:20:00Z',
          description: 'Maintenance fee'
        },
        {
          id: 'pay_1234567892',
          userId: 'user_789',
          userName: 'Bob Johnson',
          amount: 2000.00,
          currency: 'USD',
          status: 'failed',
          type: 'investment',
          date: '2023-11-13T09:15:00Z',
          description: 'Solar panel investment'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);
  
  const tableColumns = [
    {
      key: 'id',
      title: 'Payment ID',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'userName',
      title: 'Customer',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">ID: {row.userId}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (value, row) => (
        <div className="font-medium">
          {formatCurrency(value, row.currency)}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'investment' ? 'bg-blue-100 text-blue-800' :
          value === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
          value === 'refund' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];
  
  const handleViewPayment = (paymentId) => {
    console.log('View payment:', paymentId);
    // Navigate to payment details or open modal
  };
  
  const handleProcessPayment = (paymentId) => {
    console.log('Process payment:', paymentId);
    // Process the payment
  };
  
  const handleRefundPayment = (paymentId) => {
    console.log('Refund payment:', paymentId);
    // Process refund
  };
  
  const handleExportPayment = (paymentId) => {
    console.log('Export payment:', paymentId);
    // Export payment details
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <HeaderAccessIndicator
          title="Payments"
          subtitle="Manage and track all payment transactions, payouts, and financial records."
          userLevel={userLevel}
          requiredLevel="bronze"
          showLevelBadge={true}
        />
      </div>
      
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Payment Transactions</h2>
            <div className="flex space-x-2">
              <ActionAccessIndicator
                permission="payment_export"
                action="export payment data"
                userLevel={userLevel}
                variant="button"
              >
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                  Export
                </button>
              </ActionAccessIndicator>
              <ActionAccessIndicator
                permission="payment_process"
                action="process pending payments"
                userLevel={userLevel}
                variant="button"
              >
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Process Pending
                </button>
              </ActionAccessIndicator>
            </div>
          </div>
          
          <AccessGuard
            requiredLevel="bronze"
            userLevel={userLevel}
            fallback={
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-yellow-800">Payment management requires Bronze level access or higher</p>
                </div>
              </div>
            }
          >
            <Table
              columns={tableColumns}
              data={payments}
              loading={loading}
              emptyMessage="No payment transactions found"
              selectable={true}
              sortable={true}
              filterable={true}
              pagination={true}
              currentPage={1}
              totalPages={5}
              onPageChange={(page) => console.log('Page changed:', page)}
              rowsPerPage={10}
              onRowsPerPageChange={(limit) => console.log('Rows per page changed:', limit)}
              exportable={canViewPayments}
              onExport={(data) => console.log('Export data:', data)}
              RowActionsComponent={({ row }) => (
                <TableAccessIndicator
                  rowId={row.id}
                  entityType="payment"
                  permissions={{
                    canView: canViewPayments,
                    canEdit: canProcessPayments,
                    canDelete: canRefundPayments,
                    canExport: canViewPayments,
                  }}
                  userLevel={userLevel}
                  variant="dropdown"
                  onView={handleViewPayment}
                  onEdit={handleProcessPayment}
                  onDelete={handleRefundPayment}
                  onExport={handleExportPayment}
                />
              )}
            />
          </AccessGuard>
        </div>
      </Card>
    </div>
  );
};

export default PaymentsPage;