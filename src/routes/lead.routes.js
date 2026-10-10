const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
} = require('../validators/lead.validator');

router.use(protect);

router
  .route('/')
  .post(validate(createLeadSchema), leadController.createLead)
  .get(leadController.getLeads);

router
  .route('/:id')
  .get(leadController.getLeadById)
  .put(validate(updateLeadSchema), leadController.updateLead)
  .delete(restrictTo('Admin', 'Sales Manager'), leadController.deleteLead);

router.patch(
  '/:id/status',
  validate(updateLeadStatusSchema),
  leadController.updateLeadStatus
);

router.patch(
  '/:id/assign',
  restrictTo('Admin', 'Sales Manager'),
  validate(assignLeadSchema),
  leadController.assignLead
);

router.post('/:id/convert', leadController.convertLead);

module.exports = router;
