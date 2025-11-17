import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal.jsx';
import InvestorForm from './InvestorForm.jsx';
import { useInvestor } from '../../context/InvestorContext.jsx';
import { useNotification } from '../common/Notification.jsx';
import { investorsAPI } from '../../api/investors.js';

const CreateInvestorModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialData = {}
}) => {
  const { createInvestor, getInvestors } = useInvestor();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      
      // Prepare data for API submission
      const submissionData = {
        ...formData,
        // Convert currency strings to numbers
        annualIncome: formData.annualIncome ? parseFloat(formData.annualIncome.replace(/[^0-9.]/g, '')) : 0,
        netWorth: formData.netWorth ? parseFloat(formData.netWorth.replace(/[^0-9.]/g, '')) : 0,
        investmentAmount: formData.investmentAmount ? parseFloat(formData.investmentAmount.replace(/[^0-9.]/g, '')) : 0,
        expectedReturn: formData.expectedReturn ? parseFloat(formData.expectedReturn) : 0,
        
        // Handle file uploads
        documents: {
          idDocument: formData.idDocument,
          proofOfAddress: formData.proofOfAddress,
          bankStatement: formData.bankStatement,
        },
        
        // Add metadata
        status: 'pending', // New investors start as pending
        kycStatus: 'not_submitted',
        createdAt: new Date().toISOString(),
      };

      // Create investor via API
      const newInvestor = await createInvestor(submissionData);
      
      // Show success notification
      showNotification({
        type: 'success',
        message: `Investor ${formData.firstName} ${formData.lastName} has been created successfully!`,
        duration: 5000,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(newInvestor);
      }

      // Close modal
      onClose();
      
      // Refresh investors list
      await getInvestors();
      
    } catch (error) {
      console.error('Failed to create investor:', error);
      
      // Show error notification
      showNotification({
        type: 'error',
        message: error.message || 'Failed to create investor. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    // Ask for confirmation if there's unsaved data
    // For now, we'll just close the modal
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Investor"
      size="full"
      showCloseButton={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <InvestorForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={false}
            isLoading={isSubmitting}
            showSteps={true}
            autoSave={true}
          />
        </div>
      </div>
    </Modal>
  );
};

CreateInvestorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.object,
};

export default CreateInvestorModal;