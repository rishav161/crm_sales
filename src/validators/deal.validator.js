const { z } = require('zod');

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createDealSchema = z.object({
  title: z.string().min(2, 'Deal title is required'),
  leadId: mongoIdSchema.nullable().optional(),
  customerId: mongoIdSchema,
  assignedTo: mongoIdSchema.optional(),
  value: z.number().gt(0, 'Deal value must be greater than 0'),
  probability: z.number().min(0, 'Probability must be 0-100').max(100, 'Probability must be 0-100').optional(),
  expectedClosingDate: z.string().datetime({ message: 'Invalid expected closing date ISO string' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  stage: z.enum(['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost']).optional(),
  description: z.string().optional(),
  lostReason: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial();

const updateDealStageSchema = z.object({
  stage: z.enum(['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], {
    required_error: 'Stage is required',
  }),
  lostReason: z.string().optional(),
});

module.exports = {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
};
