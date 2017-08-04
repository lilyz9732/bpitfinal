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

// Login
router.get('/login', function(req, res){
	res.render('login');
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
		res.redirect('/clientindex');
	}
	else if(nuser.usertype == "Lender"){
		console.log("lender")
		passport.authenticate('local', {successRedirect: '/lenderagreement', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/lenderindex');
	}
	else if (nuser.usertype == "Broker"){
		console.log("broker")
		passport.authenticate('local', {successRedirect: '/brokerindex', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/brokerindex')
		 // res.render('users/brokerindex', {
		 //    username: req.body.username
		 //    }, function(err, html){
		 //      if (err) { 
		 //        console.err("ERR", err) 
		 //        // An error occurred, stop execution and return 500
		 //        return res.status(500).send();
		 //      }
		 //      // Return the HTML of the View
		 //      return res.send(html);
		 //    })
			// }
}})});

router.get('/brokeragreement', function(req, res){
	res.render('brokeragreement');
});

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
	res.redirect('/brokerindex')
})

router.get('/clientagreement', function(req, res){
	res.render('clientagreement');
});

router.post('/underwater', function(req, res){

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
		      	lender: req.body.lendingpartner,
		      	broker: req.body.brokerpartner,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    .catch(err =>
  process.nextTick(() => {throw err })
  ));
	req.flash('success_msg', 'You have signed your Control Agreement') ;
	res.redirect('/clientindex')
})

router.get('/lenderagreement', function(req, res){
	res.render('lenderagreement');
});

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
		      	client: req.body.clientname,
		      	broker: req.body.brokerpartner,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    .catch(err =>
  process.nextTick(() => {throw err })
  ));
	req.flash('success_msg', 'You have signed your Control Agreement') ;
	res.redirect('/lenderindex')
})

router.post('/clientindex', function(req, res){
	res.redirect('clientindex');
})

router.post('/lenderindex', function(req, res){
	res.redirect('lenderindex');
})

router.post('/brokerindex', function(req, res){
	var firstName = req.body.firstName;
	var lastName = req.body.lastName;
	var cashvalue = req.body.cashvalue;
	var cashmargin = req.body.cashmargin;
	var equityvalue = req.body.equityvalue;
	var equitymargin = req.body.equitymargin;
	var businessvalue = req.body.businessvalue;
	var businessmargin = req.body.businessmargin;
	var landvalue = req.body.landvalue;
	var landmargin = req.body.landmargin;
	var loanvalue = req.body.loanvalue;

	// Validation
	req.checkBody('firstName', 'firstName is required').notEmpty();
	req.checkBody('lastName', 'lastName is required').notEmpty();
	req.checkBody('cashvalue', 'cashvalue is not valid').notEmpty();
	req.checkBody('cashmargin', 'cashmargin is required').notEmpty();
	req.checkBody('equityvalue', 'equityvalue is required').notEmpty();
	req.checkBody('equitymargin', 'equitymargin is required').notEmpty();
	req.checkBody('businessmargin', 'businessmargin is required').notEmpty();
	req.checkBody('businessvalue', 'businessvalue is required').notEmpty();
	req.checkBody('landmargin', 'landmargin is required').notEmpty();
	req.checkBody('landvalue', 'landvalue is required').notEmpty();
	req.checkBody('loanvalue', 'loanvalue is required').notEmpty();

	var errors = req.validationErrors();

	if(errors){
		res.render('brokerindex',{
			errors:errors
		});
	} else {
  	Promise.all([
    
    // snippet create-key
    client.mockHsm.keys.create()

    ]).then(keys => {
    aliceKey = keys[0].xpub,
    // snippet signer-add-key
    signer.addKey(aliceKey, client.mockHsm.signerConnection)
    // endsnippet

    }).then(() => Promise.all([

    // snippet create-asset: cash
    client.assets.create({
    	alias: 'CASH',
    	rootXpubs: [aliceKey],
    	quorum: 1}),
    // endsnippet

    // snippet create-asset: equity
    client.assets.create({
    	alias: 'EQUITY',
    	rootXpubs: [aliceKey],
    	quorum: 1}),

    // snippet create-asset: real estate
    client.assets.create({
    	alias: 'REAL ESTATE',
    	rootXpubs: [aliceKey],
    	quorum: 1}),
    
    // snippet create-asset: business asset
    client.assets.create({
      alias: 'BUSINESS ASSETS',
      rootXpubs: [aliceKey],
      quorum: 1,
    }),
    // endsnippet

    // snippet create-asset: total collateral
    client.assets.create({
      alias: 'TOTAL COLLATERAL',
      rootXpubs: [aliceKey],
      quorum: 1,
    }),
    // endsnippet
    
    // snippet create-asset: total collateral
    client.assets.create({
      alias: 'LOAN VALUE',
      rootXpubs: [aliceKey],
      quorum: 1,
    }),
    // endsnippet

    // snippet create-account
    client.accounts.create({
      alias: req.body.firstName + " " + req.body.lastName,
      rootXpubs: [aliceKey],
      quorum: 1
    })
    // endsnippet
])).then(() => 

    // Issuing assets
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'CASH',
            amount: parseInt(req.body.cashvalue) * parseInt(req.body.cashmargin) * 0.01
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'CASH',
            amount: parseInt(req.body.cashvalue) * parseInt(req.body.cashmargin) * 0.01,
            reference_data: {
		      	client: req.body.firstName + " " + req.body.lastName,
		      	asset: 'CASH',
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))
    ).then(() => {

    //Putting the second stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'EQUITY',
            amount: parseInt(req.body.equityvalue) * parseInt(req.body.equitymargin) * 0.01
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'EQUITY',
            amount: parseInt(req.body.equityvalue) * parseInt(req.body.equitymargin) * 0.01,
            reference_data: {
		      	client: req.body.firstName + " " + req.body.lastName,
		      	asset: 'EQUITY',
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))})
    .then(() => {

    //Putting the second stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'REAL ESTATE',
            amount: parseInt(req.body.landvalue) * parseInt(req.body.landmargin) * 0.01
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'REAL ESTATE',
            amount: parseInt(req.body.landvalue) * parseInt(req.body.landmargin) * 0.01,
            reference_data: {
		      	client: req.body.firstName + " " + req.body.lastName,
		      	asset: 'REAL ESTATE',
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))})
    .then(() => {

    //Putting the second stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'BUSINESS ASSETS',
            amount: parseInt(req.body.businessvalue) * parseInt(req.body.businessmargin) * 0.01
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'BUSINESS ASSETS',
            amount: parseInt(req.body.businessvalue) * parseInt(req.body.businessmargin) * 0.01,
            reference_data: {
		      	client: req.body.firstName + " " + req.body.lastName,
		      	asset: 'BUSINESS ASSETS',
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))})
    .then(() => {

    //Putting the second stock on the ledger
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'LOAN VALUE',
            amount: parseInt(req.body.loanvalue)
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'LOAN VALUE',
            amount: parseInt(req.body.loanvalue),
            reference_data: {
		      	client: req.body.firstName + " " + req.body.lastName,
		      	asset: 'LOAN VALUE',
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))})
    .then(() => {

    var total = (parseInt(req.body.cashvalue) * parseInt(req.body.cashmargin) 
    + parseInt(req.body.equityvalue) * parseInt(req.body.equitymargin) + 
    parseInt(req.body.landvalue) * parseInt(req.body.landmargin) + 
    parseInt(req.body.businessvalue) * parseInt(req.body.businessmargin)) * 0.01

    // issuing total collateral value
    client.transactions.build(builder => {
        builder.issue({
            assetAlias: 'TOTAL COLLATERAL',
            amount: total
        })
        builder.controlWithAccount({
            accountAlias: req.body.firstName + " " + req.body.lastName,
            assetAlias: 'TOTAL COLLATERAL',
            amount: total,
            reference_data: {
                type: "totalcollateral",
            	firstname: req.body.firstName,
		      	lastname: req.body.lastName,
		      	lender: req.body.lender,
                loanvalue:req.body.loanvalue,
                total: total,
            }
        })
    })
    .then(issuance => signer.sign(issuance))
    .then(signed => client.transactions.submit(signed))})
  .catch(err =>
  process.nextTick(() => {throw err })
  )
  req.flash('success_msg', 'You have sucessfully added/updated ' + req.body.firstName + "'s account");
  res.redirect('/brokerindex')
}});

router.post('/brokerquery', function(req, res){                 
    client.transactions.queryAll({
      filter:  'inputs(reference_data.type=$1) OR outputs(reference_data.type=$1)',
      filterParams: ['totalcollateral'],
    }, (tx, next, done) => {
//      console.log("something")
      console.log(tx)
      tx.outputs.forEach(output => {
        var json = JSON.stringify(output.referenceData)
        obj = JSON.parse(json);
        res.send(obj);
      })
      next()
    })
});


router.post('/check', function(req, res){
  count = 0;
  client.transactions.queryAll({
  filter: 'outputs(reference_data.client=$1) AND outputs(reference_data.broker=$2)',
  filterParams: [req.body.client, req.body.broker],
}, (tx, next, done) => {
  tx.outputs.forEach(output => {
    count += 1;
    // var json = JSON.stringify(output.referenceData);
    // obj = JSON.parse(json);
    // res.send(obj);
    if (count == 3){
      req.flash('success_msg', req.body.client + " and " + req.body.broker + " have both signed the control agreement");
      res.redirect('/lenderindex')
    }
    next()
  })
  req.flash('error_msg', "Control agreement has not been initiated by " + req.body.broker);
  res.redirect('/lenderindex');

  // next() moves to the next item.
  // done() terminates the loop early, and causes the
  //   query promise to resolve. Passing an error will reject
  //   the promise.
  
})
})

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;