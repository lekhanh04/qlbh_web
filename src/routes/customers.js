const express = require('express');
const ctrl = require('../controllers/customersController');
const router = express.Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

