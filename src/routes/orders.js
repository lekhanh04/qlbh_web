const express = require('express');
const ctrl = require('../controllers/ordersController');
const router = express.Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.post('/', ctrl.create);
router.get('/:id/pdf', ctrl.exportToPDF);

module.exports = router;

