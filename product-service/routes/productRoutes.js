const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, allowRoles } = require('../middleware/auth');
const productUpload = require('../middleware/productUpload');

router.get('/', productController.index);
router.get('/:id', productController.show);
router.post('/', authenticate, allowRoles('admin', 'seller'), productUpload.single('image'), productController.store);
router.put('/:id', authenticate, allowRoles('admin', 'seller'), productUpload.single('image'), productController.update);
router.delete('/:id', authenticate, allowRoles('admin', 'seller'), productController.destroy);

module.exports = router;