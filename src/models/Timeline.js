const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Timeline action is required'],
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['Lead', 'Customer', 'Deal'],
      required: [true, 'Entity type is required'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      refPath: 'entityType',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
timelineSchema.index({ entityType: 1, entityId: 1 });
timelineSchema.index({ performedBy: 1 });
timelineSchema.index({ timestamp: -1 });

const Timeline = mongoose.model('Timeline', timelineSchema);
module.exports = Timeline;
