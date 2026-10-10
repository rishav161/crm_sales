const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validator');

router.use(protect);

router
  .route('/')
  .post(validate(createCustomerSchema), customerController.createCustomer)
  .get(customerController.getCustomers);

router
  .route('/:id')
  .get(customerController.getCustomerById)
  .put(validate(updateCustomerSchema), customerController.updateCustomer)
  .delete(restrictTo('Admin', 'Sales Manager'), customerController.deleteCustomer);

module.exports = router;
