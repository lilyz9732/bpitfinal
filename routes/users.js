const chain = require('chain-sdk');
var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');
// Retrieve
var MongoClient = require('mongodb').MongoClient;
var userinfo;

const client = new chain.Client();
const signer = new chain.HsmSigner()
var name = "";

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// Login
router.get('/login', function(req, res){
	res.render('login');
});

// Agreement
router.get('/agreement', function(req, res) {
	res.render('agreement');
})

// Register User
router.post('/register', function(req, res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var usertype = req.body.usertype;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('usertype', 'UserType is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			usertype: usertype,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});
		req.flash('success_msg', 'You are registered and can now login');
		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown User'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

// POST to login
router.post('/login', passport.authenticate('local', {failureRedirect:'/users/login',failureFlash: true}),
	function(req, res) {
	User.getUserByUsername(req.body.username, function(err, nuser) {
   	if(!nuser){
   		passport.authenticate('local', {successRedirect: '/client', failureRedirect:'/users/login',failureFlash: true}),
		console.log("invalid user");
	}
	if(nuser.usertype == "Client"){
		console.log("client")
		passport.authenticate('local', {successRedirect: '/clientagreement', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/clientagreement');
	}
	else if(nuser.usertype == "Lender"){
		console.log("lender")
		passport.authenticate('local', {successRedirect: '/lenderagreement', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/lenderagreement');
	}
	else if (nuser.usertype == "Broker"){
		console.log("broker")
		passport.authenticate('local', {successRedirect: '/brokerindex', failureRedirect:'/users/login',failureFlash: true}),
		 res.render('users/brokerindex', {
		    username: req.body.username
		    }, function(err, html){
		      if (err) { 
		        console.err("ERR", err) 
		        // An error occurred, stop execution and return 500
		        return res.status(500).send();
		      }
		      // Return the HTML of the View
		      return res.send(html);
		    })
			}
})});

// POST to Broker Agreement Page
router.post('/brokeragreement', function(req, res){
	Promise.all([
  client.mockHsm.keys.create(),
]).then(keys => {
  assetKey = keys[0].xpub

  signer.addKey(assetKey, client.mockHsm.signerConnection)
}).then(() => Promise.all([
  client.accounts.create({
    alias: req.body.signature,
    rootXpubs: [assetKey],
    quorum: 1,
  }),

  // create control agreement
  client.assets.create({
    alias: req.body.signature + ' Control Agreement',
    rootXpubs: [assetKey],
    quorum: 1,
  })
  // endsnippet
])).then(() =>

    // Issue Control Agreement
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1
        })
        builder.controlWithAccount({
            accountAlias: req.body.signature,
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1,
            reference_data: {
            	broker: req.body.signature,
		      	client: req.body.clientname,
		      	lender: req.body.lendingpartner,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    .catch(err =>
  process.nextTick(() => {throw err })
  ));
	req.flash('success_msg', 'You have issued a Control Agreement to ' + req.body.lendingpartner + ' and ' + req.body.clientname);
	res.redirect('/users/login')
})

// POST to client agreement page
router.post('/clientagreement', function(req, res){
	Promise.all([
  client.mockHsm.keys.create(),
]).then(keys => {
  assetKey = keys[0].xpub

  signer.addKey(assetKey, client.mockHsm.signerConnection)
}).then(() => Promise.all([
  client.accounts.create({
    alias: req.body.signature,
    rootXpubs: [assetKey],
    quorum: 1,
  }),

  // create control agreement
  client.assets.create({
    alias: req.body.signature + ' Control Agreement',
    rootXpubs: [assetKey],
    quorum: 1,
  })
  // endsnippet
])).then(() =>

    // Issue Control Agreement
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1
        })
        builder.controlWithAccount({
            accountAlias: req.body.signature,
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1,
            reference_data: {
		      	client: req.body.signature,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    .catch(err =>
  process.nextTick(() => {throw err })
  ));
	req.flash('success_msg', 'You have signed your Control Agreement') ;
	res.redirect('/users/login')
})

// POST to lender agreement page
router.post('/lenderagreement', function(req, res){
	Promise.all([
  client.mockHsm.keys.create(),
]).then(keys => {
  assetKey = keys[0].xpub

  signer.addKey(assetKey, client.mockHsm.signerConnection)
}).then(() => Promise.all([
  client.accounts.create({
    alias: req.body.signature,
    rootXpubs: [assetKey],
    quorum: 1,
  }),

  // create control agreement
  client.assets.create({
    alias: req.body.signature + ' Control Agreement',
    rootXpubs: [assetKey],
    quorum: 1,
  })
  // endsnippet
])).then(() =>

    // Issue Control Agreement
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1
        })
        builder.controlWithAccount({
            accountAlias: req.body.signature,
            assetAlias: req.body.signature + ' Control Agreement',
            amount: 1,
            reference_data: {
		      	lender: req.body.signature,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    .catch(err =>
  process.nextTick(() => {throw err })
  ));
	req.flash('success_msg', 'You have signed your Control Agreement') ;
	res.redirect('/users/login')
})

router.get('/brokerindex', function(req, res){
	res.render('brokerindex');
})

router.post('/brokerindex', function(req, res){
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
  req.flash('success_msg', 'You have logged an asset');
  res.redirect('/brokerindex')
})});

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;