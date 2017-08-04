const chain = require('chain-sdk')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
var googleStocks = require('google-stocks');
const client = new chain.Client()

mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

var routes = require('./routes/index');
var users = require('./routes/users');

// Init App
var app = express();
var colltotal = 0;

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());


// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

var upload = multer({ //multer settings
                storage: storage,
                fileFilter : function(req, file, callback) { //file filter
                    if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
                        return callback(new Error('Wrong extension type'));
                    }
                    callback(null, true);
                }
            }).single('file');
/** API path that will upload the files */
app.post('/upload', function(req, res) {
    var colltotal = 0;
    var exceltojson;
    upload(req,res,function(err){
        if(err){
             res.json({error_code:1,err_desc:err});
             return;
        }
        /** Multer gives us file info in req.file object */
        if(!req.file){
            res.json({error_code:1,err_desc:"No file passed"});
            return;
        }
        /** Check the extension of the incoming file and 
         *  use the appropriate module
         */
        if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        try {
            console.log(req.file.path);
            exceltojson({
                input: req.file.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders:true
            }, function(err,result){
                if(err) {
                    return res.json({error_code:1,err_desc:err, data: null});
                } 
                console.log(result);
                // result is the json data
                count = 0;
                for (var i in result) {
                  googleStocks([result[i].stocks], function(error, data){
                    colltotal += data[0].l * result[i].quantity;
                    count += 1;
                    if (count == result.length){
                      client.balances.queryAll({
                        filter: 'asset_alias=$1',
                        filterParams: ["LOAN VALUE"],
                      }, (loan, next) => {
                          client.balances.queryAll({
                            filter: 'asset_alias=$1',
                            filterParams: ["CASH"],
                          }, (cash, next) => {
                            client.balances.queryAll({
                              filter: 'asset_alias=$1',
                              filterParams: ["BUSINESS ASSETS"],
                            }, (business, next) => {
                              client.balances.queryAll({
                                filter: 'asset_alias=$1',
                                filterParams: ["REAL ESTATE"],
                              },(land, next) => {
                                if (loan.amount <= (colltotal + cash.amount + business.amount + land.amount)){
                                  req.flash('success_msg', 'Collateral is doing good');
                                  res.redirect('/brokerindex');
                                }
                                else {
                                  req.flash('error_msg', "Warning: Collateral is $" + (loan.amount - colltotal) + ' underwater');
                                  res.redirect('/brokerindex');
                                }
                              })
                            })
                        })
                      })
                    }
                  })
                }
                // console.log(colltotal);
                // req.flash('success_msg', 'Collateral Total is ' + colltotal) ;
                // res.redirect('users/login');
            });
        } catch (e){
            res.json({error_code:1,err_desc:"Corupted excel file"});
        }
    })
}); 
// app.get('/',function(req,res){
//     res.sendFile(__dirname + "/views/index.handlebars");
// });
// app.listen('3000', function(){
//     console.log('running on 3000...');
// });

app.use('/', routes);
app.use('/users', users);


// Set Port
app.set('port', (process.env.PORT || 3000));

app.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});