import React, { useState } from 'react';
import {
  AccessIndicator,
  NavigationAccessIndicator,
  ActionAccessIndicator,
  HeaderAccessIndicator,
  TableAccessIndicator,
  FormFieldAccessIndicator,
  AccessGuard,
} from './index';
import { useAccess } from '../../context/AccessContext';

const AccessIndicatorTest = () => {
  const { userLevel } = useAccess();
  const [testUserLevel, setTestUserLevel] = useState('standard');
  
  // Mock data for testing
  const mockUsers = [
    {
      id: 'user_1',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active',
      role: 'user',
    },
    {
      id: 'user_2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'pending',
      role: 'admin',
    },
  ];

  const mockPayments = [
    {
      id: 'pay_1',
      amount: 1500,
      status: 'completed',
      date: '2023-11-15',
    },
    {
      id: 'pay_2',
      amount: 750,
      status: 'pending',
      date: '2023-11-14',
    },
  ];

  const accessLevels = ['standard', 'investor', 'bronze', 'silver', 'gold', 'platinum'];
  const accessStates = ['available', 'limited', 'restricted', 'hidden'];
  const sizes = ['xs', 'sm', 'md', 'lg'];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Access Indicators Test Suite</h1>
      
      {/* User Level Selector */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test User Level</h2>
        <div className="flex flex-wrap gap-2">
          {accessLevels.map(level => (
            <button
              key={level}
              onClick={() => setTestUserLevel(level)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                testUserLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm">
            Current test level: <span className="font-semibold">{testUserLevel}</span>
          </p>
          <p className="text-sm">
            Actual user level: <span className="font-semibold">{userLevel}</span>
          </p>
        </div>
      </div>

      {/* Base AccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Base AccessIndicator Component</h2>
        
        <h3 className="text-lg font-medium mt-4 mb-2">All Access Levels</h3>
        <div className="flex flex-wrap gap-4">
          {accessLevels.map(level => (
            <div key={level} className="text-center">
              <AccessIndicator
                level={level}
                state="available"
                size="md"
                showLabel={true}
                tooltip={`${level} level access`}
              />
              <p className="text-xs mt-1">{level}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">All States</h3>
        <div className="flex flex-wrap gap-4">
          {accessStates.map(state => (
            <div key={state} className="text-center">
              <AccessIndicator
                level="gold"
                state={state}
                size="md"
                showLabel={true}
                showStateIcon={true}
                tooltip={`${state} state`}
              />
              <p className="text-xs mt-1">{state}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">All Sizes</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {sizes.map(size => (
            <div key={size} className="text-center">
              <AccessIndicator
                level="silver"
                state="available"
                size={size}
                showLabel={true}
                tooltip={`${size} size`}
              />
              <p className="text-xs mt-1">{size}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">Responsive Behavior</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Resize browser to test responsive behavior:</p>
          <AccessIndicator
            level="gold"
            state="available"
            size="md"
            showLabel={true}
            responsive={true}
            tooltip="Responsive indicator"
          />
        </div>
      </div>

      {/* NavigationAccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">NavigationAccessIndicator Component</h2>
        
        <h3 className="text-lg font-medium mt-4 mb-2">Navigation Items with Different Requirements</h3>
        <div className="space-y-2">
          {[
            { name: 'Dashboard', requiredLevel: 'standard' },
            { name: 'Reports', requiredLevel: 'silver' },
            { name: 'User Management', requiredLevel: 'gold' },
            { name: 'System Config', requiredLevel: 'platinum' },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between p-3 border rounded-md">
              <span>{item.name}</span>
              <NavigationAccessIndicator
                requiredLevel={item.requiredLevel}
                userLevel={testUserLevel}
                showLabel={false}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ActionAccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">ActionAccessIndicator Component</h2>
        
        <h3 className="text-lg font-medium mt-4 mb-2">Button Variant</h3>
        <div className="flex flex-wrap gap-3">
          <ActionAccessIndicator
            permission="user_view"
            action="view user"
            userLevel={testUserLevel}
            variant="button"
          >
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
              View User
            </button>
          </ActionAccessIndicator>
          
          <ActionAccessIndicator
            permission="user_edit"
            action="edit user"
            userLevel={testUserLevel}
            variant="button"
            fallback={
              <button className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed" disabled>
                Edit User (Restricted)
              </button>
            }
          >
            <button className="px-4 py-2 bg-green-600 text-white rounded-md">
              Edit User
            </button>
          </ActionAccessIndicator>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">Badge Variant</h3>
        <div className="flex flex-wrap gap-3">
          <ActionAccessIndicator
            permission="payment_view"
            action="view payments"
            userLevel={testUserLevel}
            variant="badge"
          />
          <ActionAccessIndicator
            permission="payment_approve"
            action="approve payments"
            userLevel={testUserLevel}
            variant="badge"
          />
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">Overlay Variant</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionAccessIndicator
            permission="user_delete"
            action="delete user"
            userLevel={testUserLevel}
            variant="overlay"
            showUpgradePrompt={true}
            onUpgradeRequest={() => alert('Upgrade request clicked')}
          >
            <div className="p-4 border rounded-md">
              <h4 className="font-medium">User Card</h4>
              <p className="text-sm text-gray-600">This content can be protected</p>
            </div>
          </ActionAccessIndicator>
        </div>
      </div>

      {/* HeaderAccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">HeaderAccessIndicator Component</h2>
        
        <div className="space-y-4">
          <HeaderAccessIndicator
            title="User Management"
            subtitle="Manage user accounts and permissions"
            requiredLevel="gold"
            userLevel={testUserLevel}
            showLevelBadge={true}
          />
          
          <HeaderAccessIndicator
            title="Financial Reports"
            subtitle="View and export financial data"
            requiredLevel="silver"
            userLevel={testUserLevel}
            showLevelBadge={true}
          />
          
          <HeaderAccessIndicator
            title="System Configuration"
            subtitle="Configure system settings"
            requiredLevel="platinum"
            userLevel={testUserLevel}
            showLevelBadge={true}
          />
        </div>
      </div>

      {/* TableAccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">TableAccessIndicator Component</h2>
        
        <h3 className="text-lg font-medium mt-4 mb-2">Column Variant</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TableAccessIndicator
                      rowId={user.id}
                      entityType="user"
                      permissions={{
                        canView: true,
                        canEdit: testUserLevel === 'gold' || testUserLevel === 'platinum',
                        canDelete: testUserLevel === 'platinum',
                        canExport: testUserLevel !== 'standard',
                      }}
                      userLevel={testUserLevel}
                      variant="column"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-2">Dropdown Variant</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockPayments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${payment.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TableAccessIndicator
                      rowId={payment.id}
                      entityType="payment"
                      permissions={{
                        canView: true,
                        canEdit: testUserLevel === 'gold' || testUserLevel === 'platinum',
                        canDelete: testUserLevel === 'platinum',
                        canExport: testUserLevel !== 'standard',
                      }}
                      userLevel={testUserLevel}
                      variant="dropdown"
                      onView={(id) => console.log('View payment:', id)}
                      onEdit={(id) => console.log('Edit payment:', id)}
                      onDelete={(id) => console.log('Delete payment:', id)}
                      onExport={(id) => console.log('Export payment:', id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FormFieldAccessIndicator Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">FormFieldAccessIndicator Component</h2>
        
        <div className="space-y-4 max-w-md">
          <FormFieldAccessIndicator
            fieldName="Admin Notes"
            fieldType="textarea"
            isEditable={testUserLevel === 'gold' || testUserLevel === 'platinum'}
            requiredLevel="gold"
            userLevel={testUserLevel}
            variant="inline"
            reason="Only Gold and Platinum users can edit admin notes"
          >
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Enter admin notes..."
              disabled={testUserLevel !== 'gold' && testUserLevel !== 'platinum'}
            />
          </FormFieldAccessIndicator>
          
          <FormFieldAccessIndicator
            fieldName="User Role"
            fieldType="select"
            isEditable={testUserLevel === 'gold' || testUserLevel === 'platinum'}
            requiredLevel="gold"
            userLevel={testUserLevel}
            variant="tooltip"
          >
            <select
              className="w-full p-2 border rounded-md"
              disabled={testUserLevel !== 'gold' && testUserLevel !== 'platinum'}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </FormFieldAccessIndicator>
        </div>
      </div>

      {/* AccessGuard Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">AccessGuard Component</h2>
        
        <div className="space-y-4">
          <AccessGuard
            requiredLevel="standard"
            userLevel={testUserLevel}
            fallback={
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">Access denied: Standard level required</p>
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">Accessible content for Standard level</p>
            </div>
          </AccessGuard>
          
          <AccessGuard
            requiredLevel="gold"
            userLevel={testUserLevel}
            fallback={
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">Access denied: Gold level required</p>
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">Accessible content for Gold level</p>
            </div>
          </AccessGuard>
          
          <AccessGuard
            requiredLevel="platinum"
            userLevel={testUserLevel}
            showUpgradePrompt={true}
            onAccessDenied={() => alert('Upgrade requested!')}
            fallback={
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">Access denied: Platinum level required</p>
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">Accessible content for Platinum level</p>
            </div>
          </AccessGuard>
        </div>
      </div>

      {/* Accessibility Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Accessibility Tests</h2>
        <p className="text-gray-600 mb-4">
          Test keyboard navigation (Tab, Enter, Space, Escape) and screen reader compatibility.
        </p>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Keyboard Navigation Test</h3>
            <div className="flex gap-2">
              <AccessIndicator
                level="silver"
                state="available"
                size="md"
                showLabel={true}
                tooltip="Test keyboard navigation"
                tabIndex={0}
              />
              <NavigationAccessIndicator
                requiredLevel="gold"
                userLevel={testUserLevel}
                size="sm"
              />
              <ActionAccessIndicator
                permission="user_view"
                action="view user"
                userLevel={testUserLevel}
                variant="badge"
              />
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">ARIA Labels Test</h3>
            <p className="text-sm text-gray-600">
              Check screen reader output for proper ARIA labels and descriptions.
            </p>
          </div>
        </div>
      </div>

      {/* Performance Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance Tests</h2>
        <p className="text-gray-600 mb-4">
          Monitor browser dev tools for performance with multiple indicators.
        </p>
        
        <div>
          <h3 className="font-medium mb-2">Multiple Indicators Test</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 100 }).map((_, i) => (
              <AccessIndicator
                key={i}
                level={accessLevels[i % accessLevels.length]}
                state={accessStates[i % accessStates.length]}
                size="xs"
                showLabel={false}
                tooltip={`Performance test indicator ${i}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessIndicatorTest;