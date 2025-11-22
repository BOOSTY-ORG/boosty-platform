import mongoose from "mongoose";

const solarApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationId: { type: String, unique: true, required: true },
  personalInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' }
  },
  propertyDetails: {
    propertyType: { 
      type: String, 
      enum: ['residential', 'commercial', 'industrial'], 
      required: true 
    },
    monthlyElectricityBill: { type: Number, required: true },
    averageDailyConsumption: { type: Number },
    appliances: [{
      name: { type: String },
      quantity: { type: Number },
      wattage: { type: Number },
      hoursPerDay: { type: Number }
    }]
  },
  financialInfo: {
    monthlyIncome: { type: Number, required: true },
    employmentStatus: { 
      type: String, 
      enum: ['employed', 'self-employed', 'unemployed', 'retired'], 
      required: true 
    },
    creditScore: { type: Number },
    existingLoans: { type: Number, default: 0 }
  },
  systemRequirements: {
    estimatedCost: { type: Number, required: true },
    systemSize: { type: Number }, // in kW
    panelCount: { type: Number },
    batteryCapacity: { type: Number },
    installationType: { 
      type: String, 
      enum: ['rooftop', 'ground-mount', 'hybrid'], 
      default: 'rooftop' 
    }
  },
  applicationStatus: { 
    type: String, 
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded', 'installation_scheduled', 'installed', 'active', 'completed'], 
    default: 'draft' 
  },
  kycStatus: { 
    type: String, 
    enum: ['not_started', 'pending', 'under_review', 'verified', 'rejected'], 
    default: 'not_started' 
  },
  assignedInvestor: { type: mongoose.Schema.Types.ObjectId, ref: 'Investor' },
  fundingAmount: { type: Number },
  repaymentSchedule: [{
    dueDate: { type: Date },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'paid', 'overdue'] },
    paidDate: { type: Date }
  }],
  aiScore: { type: Number }, // AI-generated creditworthiness score
  aiRecommendations: [{ type: String }],
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  fundedAt: { type: Date },
  installedAt: { type: Date }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
solarApplicationSchema.index({ userId: 1 });
solarApplicationSchema.index({ applicationId: 1 });
solarApplicationSchema.index({ applicationStatus: 1 });
solarApplicationSchema.index({ kycStatus: 1 });
solarApplicationSchema.index({ 'personalInfo.state': 1 });
solarApplicationSchema.index({ 'propertyDetails.propertyType': 1 });
solarApplicationSchema.index({ createdAt: -1 });
solarApplicationSchema.index({ submittedAt: -1 });
solarApplicationSchema.index({ assignedInvestor: 1 });

// Compound indexes for complex queries
solarApplicationSchema.index({ applicationStatus: 1, kycStatus: 1, createdAt: -1 });
solarApplicationSchema.index({ 'personalInfo.state': 1, applicationStatus: 1 });

// Virtual fields for calculated metrics
solarApplicationSchema.virtual('applicationAge').get(function() {
  const now = new Date();
  const created = this.createdAt || now;
  return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // days
});

solarApplicationSchema.virtual('processingTime').get(function() {
  if (this.submittedAt && this.approvedAt) {
    return Math.floor((this.approvedAt - this.submittedAt) / (1000 * 60 * 60 * 24)); // days
  }
  return null;
});

solarApplicationSchema.virtual('totalRepayments').get(function() {
  if (!this.repaymentSchedule) return 0;
  return this.repaymentSchedule.reduce((total, payment) => total + (payment.amount || 0), 0);
});

solarApplicationSchema.virtual('paidRepayments').get(function() {
  if (!this.repaymentSchedule) return 0;
  return this.repaymentSchedule
    .filter(payment => payment.status === 'paid')
    .reduce((total, payment) => total + (payment.amount || 0), 0);
});

// Pre-save middleware to generate application ID if not provided
solarApplicationSchema.pre('save', async function(next) {
  if (this.isNew && !this.applicationId) {
    const count = await this.constructor.countDocuments();
    this.applicationId = `APP${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const SolarApplication = mongoose.model('SolarApplication', solarApplicationSchema);

export default SolarApplication;