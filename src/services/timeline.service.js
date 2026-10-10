const Timeline = require('../models/Timeline');

/**
 * Log an audit history event to Timeline collection
 */
const logTimelineEvent = async ({
  action,
  entityType,
  entityId,
  performedBy,
  previousValue = null,
  newValue = null,
  metadata = {},
  session = null,
}) => {
  try {
    const timelineData = {
      action,
      entityType,
      entityId,
      performedBy,
      previousValue,
      newValue,
      metadata,
    };

    if (session) {
      await Timeline.create([timelineData], { session });
    } else {
      await Timeline.create(timelineData);
    }
  } catch (error) {
    console.error(`[Timeline Log Error]: ${error.message}`);
    // Non-blocking for primary business flow
  }
};

module.exports = {
  logTimelineEvent,
};
