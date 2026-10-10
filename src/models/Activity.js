const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note'],
      required: [true, 'Activity type is required'],
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity must be assigned to a user'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Overdue'],
      default: 'Pending',
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['Lead', 'Customer', 'Deal', 'User'],
        required: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'relatedEntity.entityType',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware/method to update status dynamically if overdue
activitySchema.methods.updateOverdueStatus = function () {
  if (this.status === 'Pending' && new Date(this.dueDate) < new Date()) {
    this.status = 'Overdue';
  }
};

// Indexes
activitySchema.index({ assignedTo: 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ dueDate: 1 });
activitySchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
