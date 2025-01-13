const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const {userAuth,adminAuth}=require('../middlewares/auth')
const customerCountroller=require('../controllers/admin/customerCountroller')
const categoryController=require('../controllers/admin/categoryController')
const productController=require('../controllers/admin/productController')
const  upload=require('../utils/multer')
const OrderController=require('../controllers/admin/oderController')




router.get('/login', adminController.Loadlogin);
router.post('/login', adminController.login);
router.get('/pageError',adminController.pageError)

router.get('/dashboard',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout)
router.get('/users',adminAuth,customerCountroller.customerInfo);
router.get('/block')
router.get('/blockCustomer',adminAuth,customerCountroller.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerCountroller.customerunBlocked)


router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, upload.single('image'), categoryController.addcategory); 
router.get('/listCategory', adminAuth, categoryController.getListCateroty); 
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCateroty);
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id', adminAuth, upload.single('image'), categoryController.editCategory);



router.get("/addProducts", productController.getProductAddPage);
 router.post("/addProducts",  upload.array('productImages',3),productController.addProducts);
router.get('/products',productController.getAllProducts);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/blockProduct',productController.blockProduct)
router.get('/editProduct',productController.geteditProduct)//
//router.get("/editProduct/:id",adminAuth, productController.geteditProduct);
router.post('/editProduct/:id',upload.array('images',3), productController.editProduct);
 router.delete('/products/delete-image/:productId',productController.deleteSingleImage);
 router.get('/product-variants',productController.getProductVariants);
 router.post('/product-variants',productController.handleProductvariants);




 router.get('/orders', adminAuth,OrderController.getAllOrders);
 router.get('/orders/:orderId', adminAuth,OrderController.getOrderDetails);
 router.post('/orders/update-status', adminAuth,OrderController.updateOrderStatus);



module.exports = router;

