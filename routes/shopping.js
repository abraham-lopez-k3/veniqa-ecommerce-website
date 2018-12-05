import express from 'express';
import shoppingController from '../controllers/shoppingController';
import passportAuth from '../authentication/passportAuth';
var router = express.Router();

/* GET Amazon Endpoint. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Veniqa Shopping' });
});

router.post('/addToCart', passportAuth.isAuthenticated, shoppingController.addToCart);

router.get('/getCart', passportAuth.isAuthenticated, shoppingController.getCart);

module.exports = router;