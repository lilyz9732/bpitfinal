var express = require('express');
var router = express.Router();

// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	res.render('login');
});

// Client
router.get('/client', function(req, res){
	res.render('client');
});

// Lender 
router.get('/lender', function(req, res){
	res.render('lender');
});

// Broker 
router.get('/broker', function(req, res){
	res.render('broker');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}

module.exports = router;