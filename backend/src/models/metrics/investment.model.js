const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema({
  investmentId: { type: String, unique: true, required: true },
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investor', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SolarApplication', required: true },
  amount: { type: Number, required: true },
  expectedReturn: { type: Number, required: true },
  actualReturn: { type: Number, default: 0 },
  interestRate: { type: Number, required: true },
  term: { type: Number, required: true }, // in months
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed', 'defaulted', 'terminated'], 
    default: 'pending' 
  },
  repaymentSchedule: [{
    dueDate: { type: Date },
    amount: { type: Number },
    principal: { type: Number },
    interest: { type: Number },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial'] },
    paidDate: { type: Date },
    paidAmount: { type: Number }
  }],
  riskAssessment: {
    creditScore: { type: Number },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    riskFactors: [{ type: String }]
  },
  performance: {
    roi: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    onTimePayments: { type: Number, default: 0 },
    latePayments: { type: Number, default: 0 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
investmentSchema.index({ investmentId: 1 });
investmentSchema.index({ investorId: 1 });
investmentSchema.index({ applicationId: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ startDate: -1 });
investmentSchema.index({ endDate: -1 });
investmentSchema.index({ amount: -1 });
investmentSchema.index({ interestRate: -1 });

// Compound indexes for complex queries
investmentSchema.index({ investorId: 1, status: 1, startDate: -1 });
investmentSchema.index({ status: 1, endDate: -1 });
investmentSchema.index({ investorId: 1, applicationId: 1 });

// Virtual fields for calculated metrics
investmentSchema.virtual('totalRepayments').get(function() {
  if (!this.repaymentSchedule) return 0;
  return this.repaymentSchedule.reduce((total, payment) => total + (payment.paidAmount || 0), 0);
});

investmentSchema.virtual('pendingRepayments').get(function() {
  if (!this.repaymentSchedule) return 0;
  return this.repaymentSchedule.filter(payment => payment.status === 'pending').length;
});

investmentSchema.virtual('overdueRepayments').get(function() {
  if (!this.repaymentSchedule) return 0;
  const now = new Date();
  return this.repaymentSchedule.filter(payment => 
    payment.status === 'pending' && new Date(payment.dueDate) < now
  ).length;
});

investmentSchema.virtual('currentROI').get(function() {
  if (this.amount === 0) return 0;
  return (this.actualReturn / this.amount) * 100;
});

investmentSchema.virtual('annualizedROI').get(function() {
  if (this.amount === 0 || this.performance.daysActive === 0) return 0;
  const dailyReturn = this.actualReturn / this.performance.daysActive;
  const annualReturn = dailyReturn * 365;
  return (annualReturn / this.amount) * 100;
});

investmentSchema.virtual('onTimePaymentRate').get(function() {
  const totalPayments = this.performance.onTimePayments + this.performance.latePayments;
  if (totalPayments === 0) return 0;
  return (this.performance.onTimePayments / totalPayments) * 100;
});

investmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

investmentSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

investmentSchema.virtual('isDefaulted').get(function() {
  return this.status === 'defaulted';
});

// Pre-save middleware to generate investment ID if not provided
investmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.investmentId) {
    const count = await this.constructor.countDocuments();
    this.investmentId = `INV${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
  }
  
  // Update performance metrics
  if (this.isModified('actualReturn') || this.isModified('amount')) {
    this.performance.roi = this.currentROI;
  }
  
  // Calculate days active
  if (this.startDate && (this.status === 'active' || this.status === 'completed')) {
    const endDate = this.status === 'completed' ? new Date() : new Date();
    this.performance.daysActive = Math.floor((endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  
  next();
});

// Pre-save middleware to update payment statistics
investmentSchema.pre('save', function(next) {
  if (this.isModified('repaymentSchedule')) {
    let onTime = 0;
    let late = 0;
    
    this.repaymentSchedule.forEach(payment => {
      if (payment.status === 'paid') {
        const dueDate = new Date(payment.dueDate);
        const paidDate = new Date(payment.paidDate);
        
        if (paidDate <= dueDate) {
          onTime++;
        } else {
          late++;
        }
      }
    });
    
    this.performance.onTimePayments = onTime;
    this.performance.latePayments = late;
  }
  
  next();
});

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;