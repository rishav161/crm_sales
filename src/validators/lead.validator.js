const { z } = require('zod');

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createLeadSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['Website', 'Referral', 'Social Media', 'Email', 'Phone', 'Other']).optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  assignedTo: mongoIdSchema.nullable().optional(),
  description: z.string().optional(),
});

const updateLeadSchema = createLeadSchema.partial();

const updateLeadStatusSchema = z.object({
  status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'], {
    required_error: 'Status is required',
  }),
});

const assignLeadSchema = z.object({
  assignedTo: mongoIdSchema,
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
};
