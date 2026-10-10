const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'Sales Manager', 'Sales Executive']),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['Admin', 'Sales Manager', 'Sales Executive']).optional(),
  isActive: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
};
