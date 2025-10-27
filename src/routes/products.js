const express = require('express');
const ctrl = require('../controllers/productsController');
const router = express.Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/add-stock', ctrl.addStock);
router.delete('/:id', ctrl.remove);
router.post('/import-excel', ctrl.upload, ctrl.importFromExcel);

module.exports = router;

