var express = require('express');
var router = express.Router();
const chain = require('chain-sdk')
var googleStocks = require('google-stocks');
// var fetchQuotes = require('yahoo-finance-quotes');
const client = new chain.Client()

let _signer
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

router.post('/broker', function(req, res){
	console.log("hello")
  Promise.resolve().then(() => {
    // snippet create-key
    const keyPromise = client.mockHsm.keys.create()
    // endsnippet
    return keyPromise
    }).then(key => {
    // snippet signer-add-key
    const signer = new chain.HsmSigner()
    signer.addKey(key.xpub, client.mockHsm.signerConnection)
    // endsnippet

    _signer = signer
    return key
    }).then(key => {

    // snippet create-asset: STOCK 1
    const goldPromise = client.assets.create({
      alias: (req.body.Stock1).replace(/\s+/g, ''),
      rootXpubs: [key.xpub],
      quorum: 1,
    })
    // endsnippet

    // snippet create-asset: STOCK 2
    const silverPromise = client.assets.create({
      alias: (req.body.Stock2).replace(/\s+/g, ''),
      rootXpubs: [key.xpub],
      quorum: 1,
    })
    //snippet create-asset: NameTotal (To store total collateral)
    const totalPromise = client.assets.create({
      alias: req.body.firstName + req.body.lastName+"Total",
      rootXpubs: [key.xpub],
      quorum: 1,
    })
    // endsnippet
    // snippet create-account-alice: FIRST & LAST NAME
    const alicePromise = client.accounts.create({
      alias: req.body.firstName + " " + req.body.lastName,
      rootXpubs: [key.xpub],
      quorum: 1
    })
    // endsnippet

    return Promise.all([goldPromise, silverPromise, alicePromise,totalPromise]);
    res.send({msg:''});
    }).then( t => {

    //TRANSACTIONS:
    //Putting the first stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: (req.body.Stock1).replace(/\s+/g, ''),
            amount: parseInt(req.body.quantity1)
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: (req.body.Stock1).replace(/\s+/g, ''),
            amount: parseInt(req.body.quantity1)
        })
    }).then(issuance => {
        return _signer.sign(issuance)
    }).then(signed => {
        return client.transactions.submit(signed)
    })
  }).then( v => {

    //Putting the second stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: (req.body.Stock2).replace(/\s+/g, ''),
            amount: parseInt(req.body.quantity2)
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: (req.body.Stock2).replace(/\s+/g, ''),
            amount: parseInt(req.body.quantity2)
        })
    }).then(issuance => {
        return _signer.sign(issuance)
    }).then(signed => {
        return client.transactions.submit(signed)
    })
  }).then( f => {

    googleStocks([(req.body.Stock1).replace(/\s+/g, '')], function(error, data) {
    		var Stock1Total=data[0].l * req.body.quantity1;
  	});
    //var Stock1Total=data[0].l * req.body.quantity1;

    googleStocks([(req.body.Stock2).replace(/\s+/g, '')], function(error, data) {
    		var Stock2Total=data[0].l * req.body.quantity2;
  	});

    //Putting the total stock amount on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: req.body.firstName + req.body.lastName+"Total",
            amount: Stock2Total+Stock1Total
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: req.body.firstName + req.body.lastName+"Total",
            amount: Stock2Total+Stock1Total
        })
    }).then(issuance => {
        return _signer.sign(issuance)
    }).then(signed => {
        return client.transactions.submit(signed)
    })
  }).catch(err =>
  process.nextTick(() => {throw err }),
  res.send({msg:err})
  )
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