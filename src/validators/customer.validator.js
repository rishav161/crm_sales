const { z } = require('zod');

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  leadId: mongoIdSchema.nullable().optional(),
  assignedTo: mongoIdSchema.optional(),
  status: z.enum(['Active', 'Inactive', 'Archived']).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
};
