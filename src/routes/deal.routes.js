const express = require('express');
const router = express.Router();
const dealController = require('../controllers/deal.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
} = require('../validators/deal.validator');

router.use(protect);

router
  .route('/')
  .post(validate(createDealSchema), dealController.createDeal)
  .get(dealController.getDeals);

router
  .route('/:id')
  .get(dealController.getDealById)
  .put(validate(updateDealSchema), dealController.updateDeal)
  .delete(restrictTo('Admin', 'Sales Manager'), dealController.deleteDeal);

router.patch(
  '/:id/stage',
  validate(updateDealStageSchema),
  dealController.updateDealStage
);

module.exports = router;
