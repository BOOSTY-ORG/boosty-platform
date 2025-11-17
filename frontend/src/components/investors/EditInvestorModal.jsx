import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal.jsx';
import InvestorForm from './InvestorForm.jsx';
import { useInvestor } from '../../context/InvestorContext.jsx';
import { useNotification } from '../common/Notification.jsx';
import { investorsAPI } from '../../api/investors.js';

const EditInvestorModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  investorId
}) => {
  const { updateInvestor, getInvestorById, currentInvestor } = useInvestor();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  // Load investor data when modal opens
  useEffect(() => {
    if (isOpen && investorId) {
      loadInvestorData();
    }
  }, [isOpen, investorId]);

  const loadInvestorData = async () => {
    try {
      setIsLoading(true);
      const investor = await getInvestorById(investorId);
      
      // Format data for form
      const formattedData = {
        ...investor,
        // Ensure address object exists
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          ...investor.address,
        },
        // Format currency fields
        annualIncome: investor.annualIncome ? investor.annualIncome.toString() : '',
        netWorth: investor.netWorth ? investor.netWorth.toString() : '',
        investmentAmount: investor.investmentAmount ? investor.investmentAmount.toString() : '',
        // Format expected return
        expectedReturn: investor.expectedReturn ? investor.expectedReturn.toString() : '',
        // Ensure arrays exist
        investmentGoals: investor.investmentGoals || [],
        preferredSectors: investor.preferredSectors || [],
        // Handle checkboxes
        kycDeclaration: investor.kycDeclaration || false,
        consentToDataProcessing: investor.consentToDataProcessing || false,
        // Handle documents (they might be URLs or objects)
        idDocument: null, // Don't pre-load documents for editing
        proofOfAddress: null,
        bankStatement: null,
      };
      
      setInitialData(formattedData);
    } catch (error) {
      console.error('Failed to load investor data:', error);
      
      showNotification({
        type: 'error',
        message: 'Failed to load investor data. Please try again.',
        duration: 5000,
      });
      
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      
      // Prepare data for API submission (only send changed fields)
      const submissionData = {
        ...formData,
        // Convert currency strings to numbers
        annualIncome: formData.annualIncome ? parseFloat(formData.annualIncome.replace(/[^0-9.]/g, '')) : 0,
        netWorth: formData.netWorth ? parseFloat(formData.netWorth.replace(/[^0-9.]/g, '')) : 0,
        investmentAmount: formData.investmentAmount ? parseFloat(formData.investmentAmount.replace(/[^0-9.]/g, '')) : 0,
        expectedReturn: formData.expectedReturn ? parseFloat(formData.expectedReturn) : 0,
        
        // Handle file uploads (only if new files are provided)
        documents: {
          idDocument: formData.idDocument,
          proofOfAddress: formData.proofOfAddress,
          bankStatement: formData.bankStatement,
        },
        
        // Add metadata
        updatedAt: new Date().toISOString(),
      };

      // Update investor via API
      const updatedInvestor = await updateInvestor(investorId, submissionData);
      
      // Show success notification
      showNotification({
        type: 'success',
        message: `Investor ${formData.firstName} ${formData.lastName} has been updated successfully!`,
        duration: 5000,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(updatedInvestor);
      }

      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Failed to update investor:', error);
      
      // Show error notification
      showNotification({
        type: 'error',
        message: error.message || 'Failed to update investor. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    // Ask for confirmation if there are unsaved changes
    // For now, we'll just close the modal
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Investor: ${currentInvestor?.firstName || ''} ${currentInvestor?.lastName || ''}`}
      size="full"
      showCloseButton={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <InvestorForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing={true}
              isLoading={isSubmitting}
              showSteps={true}
              autoSave={false} // Don't auto-save for editing
              investorId={investorId}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

EditInvestorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  investorId: PropTypes.string.isRequired,
};

export default EditInvestorModal;