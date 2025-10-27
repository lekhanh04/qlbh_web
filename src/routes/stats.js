const express = require('express');
const ctrl = require('../controllers/statsController');
const router = express.Router();

router.get('/revenue', ctrl.revenue);
router.get('/top-products', ctrl.topProducts);

module.exports = router;













