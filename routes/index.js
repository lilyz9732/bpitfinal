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

router.post('/broker', function(req, res){
  	Promise.all([
    
    // snippet create-key
    client.mockHsm.keys.create()

    ]).then(keys => {
    aliceKey = keys[0].xpub,
    // snippet signer-add-key
    signer.addKey(aliceKey, client.mockHsm.signerConnection)
    // endsnippet

    }).then(() => Promise.all([

    // snippet create-asset: STOCK 1
    client.assets.create({
    	alias: req.body.Stock1,
    	rootXpubs: [aliceKey],
    	quorum: 1}),
    // endsnippet

    // snippet create-asset: STOCK 2
    client.assets.create({
    	alias: req.body.Stock2,
    	rootXpubs: [aliceKey],
    	quorum: 1}),
    
    //snippet create-asset: NameTotal (To store total collateral)
    client.assets.create({
      alias: 'Loan Value',
      rootXpubs: [aliceKey],
      quorum: 1,
    }),
    // endsnippet
    
    // snippet create-account-alice: FIRST & LAST NAME
    client.accounts.create({
      alias: req.body.firstName + " " + req.body.lastName,
      rootXpubs: [aliceKey],
      quorum: 1
    })
    // endsnippet
])).then(() => 

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
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    ).then(() => {

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
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
  // }).then( f => {

  //   googleStocks([(req.body.Stock1).replace(/\s+/g, '')], function(error, data) {
  //   		var Stock1Total=data[0].l * req.body.quantity1;
  // 	});
  //   //var Stock1Total=data[0].l * req.body.quantity1;

  //   googleStocks([(req.body.Stock2).replace(/\s+/g, '')], function(error, data) {
  //   		var Stock2Total=data[0].l * req.body.quantity2;
  // 	});

  //   //Putting the total stock amount on the ledger
  //   client.transactions.build(builder => {
  //       builder.issue({
  //           assetAlias: req.body.firstName + req.body.lastName+"Total",
  //           amount: Stock2Total+Stock1Total
  //       })
  //       builder.controlWithAccount({
  //           accountAlias: req.body.firstName + " " + req.body.lastName,
  //           assetAlias: req.body.firstName + req.body.lastName+"Total",
  //           amount: Stock2Total+Stock1Total
  //       })
  //   })
  // .then(issuance => {
  //       return _signer.sign(issuance)
  //   }).then(signed => {
  //       return client.transactions.submit(signed)
  //   })
  // })
  .catch(err =>
  process.nextTick(() => {throw err })
  )
})});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
};

module.exports = router;