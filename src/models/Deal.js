const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Deal must be linked to a customer'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Deal must be assigned to an employee'],
    },
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0.01, 'Deal value must be greater than zero'],
    },
    probability: {
      type: Number,
      required: [true, 'Probability is required'],
      min: [0, 'Probability cannot be negative'],
      max: [100, 'Probability cannot exceed 100%'],
      default: 50,
    },
    expectedRevenue: {
      type: Number,
      default: 0,
    },
    expectedClosingDate: {
      type: Date,
      required: [true, 'Expected closing date is required'],
    },
    stage: {
      type: String,
      enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'Qualification',
    },
    lostReason: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save calculate expected revenue
dealSchema.pre('save', function (next) {
  if (this.isModified('value') || this.isModified('probability')) {
    this.expectedRevenue = (this.value * this.probability) / 100;
  }
  next();
});

// Indexes
dealSchema.index({ stage: 1 });
dealSchema.index({ assignedTo: 1 });
dealSchema.index({ customerId: 1 });
dealSchema.index({ leadId: 1 });
dealSchema.index({ expectedClosingDate: 1 });
dealSchema.index({ createdAt: -1 });

const Deal = mongoose.model('Deal', dealSchema);
module.exports = Deal;
