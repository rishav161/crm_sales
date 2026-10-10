const { z } = require('zod');

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createActivitySchema = z.object({
  type: z.enum(['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note']),
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  assignedTo: mongoIdSchema.optional(),
  dueDate: z.string().datetime({ message: 'Invalid ISO date string for due date' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  relatedEntity: z.object({
    entityType: z.enum(['Lead', 'Customer', 'Deal', 'User']),
    entityId: mongoIdSchema,
  }),
});

const updateActivitySchema = z.object({
  type: z.enum(['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note']).optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assignedTo: mongoIdSchema.optional(),
  dueDate: z.string().optional(),
  status: z.enum(['Pending', 'Completed', 'Overdue']).optional(),
});

module.exports = {
  createActivitySchema,
  updateActivitySchema,
};
