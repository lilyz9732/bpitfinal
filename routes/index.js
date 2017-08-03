var express = require('express');
var router = express.Router();
var googleStocks = require('google-stocks');
const chain = require('chain-sdk');
// var fetchQuotes = require('yahoo-finance-quotes');
const client = new chain.Client();
const signer = new chain.HsmSigner()
let aliceKey, assetkey

// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	res.render('login');
});

// Client
router.get('/clientagreement', function(req, res){
	res.render('clientagreement');
});

// Lender 
router.get('/lenderagreement', function(req, res){
	res.render('lenderagreement');
});

// Broker 
router.get('/brokeragreement', function(req, res){
	res.render('brokeragreement');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
};

module.exports = router;