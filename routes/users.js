var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');
// Retrieve
var MongoClient = require('mongodb').MongoClient;
var userinfo;

// // Connect to the db
// MongoClient.connect("mongodb://localhost:27017/exampleDb", function(err, db) {
//   if(!err) {
//     console.log("We are connected");
//   }
// });

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

router.post('/agreement', function(req, res) {
	req.checkBody('signature', 'Signature is required').notEmpty();
	var errors = req.validationErrors();
	if(errors){
		res.render('agreement',{
			errors:errors
		});
	} else {
		req.flash('success_msg', 'You are registered and can now login');
		res.redirect('/users/login');
}})

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

		res.redirect('/users/agreement');
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

router.post('/login', passport.authenticate('local', {failureRedirect:'/users/login',failureFlash: true}),
	function(req, res) {
	User.getUserByUsername(req.body.username, function(err, nuser) {
   	if(!nuser){
   		passport.authenticate('local', {successRedirect: '/client', failureRedirect:'/users/login',failureFlash: true}),
		console.log("invalid user");
	}
	if(nuser.usertype == "Client"){
		console.log("client")
		passport.authenticate('local', {successRedirect: '/client', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/client');
	}
	else if(nuser.usertype == "Lender"){
		console.log("lender")
		passport.authenticate('local', {successRedirect: '/lender', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/lender');
	}
	else if (nuser.usertype == "Broker"){
		console.log("broker")
		passport.authenticate('local', {successRedirect: '/broker', failureRedirect:'/users/login',failureFlash: true}),
		res.redirect('/broker');
	}
	else {
		res.redirect('/');
		console.log("err");
	}})
});

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;