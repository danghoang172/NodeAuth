/*
Module Dependencies 
*/
var google = require("googleapis");
var plus = google.plus({
  version: 'v1',
  auth: oauth2Client
});
var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var hash = require('./pass').hash;
var OAuth2 = google.auth.OAuth2;
var app = express();
var session = require('express-session');
var multer = require('multer');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var oauth2Client = new OAuth2("1033019170702-rve7g8nh21ekfkbcpk47113jf0td7enb.apps.googleusercontent.com", 
								"F_JnQG1fbbQ5bRxbuHd3p6E4", 
								"http://xamloz.com/projects/oauth_app/oauthcallback"
);

// generate a url that asks permissions for Google+ scopes
var scopes = [
  'https://www.googleapis.com/auth/plus.login'
];

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
	birthDate: Date,
    salt: String,
    hash: String
});

var url = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
  scope: scopes // If you only need one scope you can pass it as string
});
var User = mongoose.model('usrs', UserSchema);
var API_KEY = "AIzaSyAi9mcGJI1ef6A9j4Bn601f041ewxV4p6k";
var ageMin;
var ggUser;
/*
Database and Models
*/
mongoose.connect("mongodb://gwyn:Hoangnguyen95@ds151242.mlab.com:51242/oauth_app");

/*
Middlewares and configurations 
*/

var server = app.listen(8080, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// parse multipart/form-data
app.use(multer());
app.use(express.static(path.join(__dirname, 'public'))); 
app.use(cookieParser())
app.use(session({ resave: true, saveUninitialized: true, secret: 'uwotm8' }));
app.use(express.static(path.join(__dirname, 'statics')));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');


app.use(function (req, res, next) {
    var err = req.session.error,
        msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
});


/*
app.set('port', (process.env.PORT || 8080));


app.listen(app.get('port'), function() {
 console.log('Node app is running on port', app.get('port'));
});

*/



/*
Helper Functions
*/
function authenticate(name, pass, fn) {
    if (!module.parent) console.log('authenticating %s:%s', name, pass);

    User.findOne({
        username: name
    },

    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            hash(pass, user.salt, function (err, hash) {
                if (err) return fn(err);
                if (hash == user.hash) return fn(null, user);
                fn(new Error('invalid password'));
            });
        } else {
            return fn(new Error('cannot find user'));
        }
    });

}

function requiredAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

function userExist(req, res, next) {
    User.count({
        username: req.body.username
    }, function (err, count) {
        if (count === 0) {
            next();
        } else {
            req.session.error = "User Exist"
            res.redirect("/signup");
        }
    });
}

function checkAge(age) {	
		if(age >= 18){
			return true;
		}
		else{
			return false;
		}
};

function calculateAge(birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/*
Routes
*/
app.get("/", function (req, res) {
    if (req.session.user) {
		res.render("main");

    } else {
        res.render("main");
    }
});

app.get("/signup", function (req, res) {
    if (req.session.user) {
        res.redirect('/profile');
    } else {
        res.render("signup");
    }
});

app.post("/signup", userExist, function (req, res) {
    var password = req.body.password;
    var username = req.body.username;
	var birthDate = req.body.birthDate;

    hash(password, function (err, salt, hash) {
        if (err){
			throw err;			
		} 
		else{
			var user = new User({
            username: username,
			birthDate: birthDate,
            salt: salt,
            hash: hash,
			}).save(function (err, newUser) {
				if (err) throw err;
				else{
					authenticate(newUser.username, password, function(err, user){
					if(user){
						req.session.regenerate(function(){
							req.session.user = user;
							req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
							res.redirect('/');
						});
					}
				});

				}
				
			});
			
		}
        
    });
});

app.get("/login", function (req, res) {
    res.render("main");
});

app.post("/login", function (req, res) {
	if(req.body.username){
		authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {

            req.session.regenerate(function () {

                req.session.user = user;
				req.session.userAge = calculateAge(user.birthDate);
				console.log(req.session.userAge);
                res.redirect('/profile');
            });
        } else {
            req.session.error = 'Authentication failed, please check your ' + ' username and password.';
            res.redirect('/login');
        }
    });
	}
	
	//using oauth
	else{
		if(req.body.strategy){
			ageMin = req.body.ageMin;
			res.redirect('/test');
		}
	}
		
    
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

app.get('/test', function (req, res) {
	if (checkAge(ageMin)) {
        res.render("profile");
    } else {
		res.render("505");
    }
});


app.get('/profile', requiredAuthentication, function (req, res) {
	if (checkAge(req.session.userAge)) {
        res.render("profile");
    } else {
		res.render("505");
    }
	
});

app.get("/userinfo", function(req, res) {
	  plus.people.get({
	  key: API_KEY,	  
	  userId: 'me',
	  auth: oauth2Client}, 
	  function (err, response) {
	  // handle err and response
		 if (err) {
		  console.log(err);
		  res.send(err);
		  return;
		}
		console.log(err);
		console.log(response);
		res.send(response);
	});
});

app.get("/url", function(req, res) {
  res.send(url);
});

app.get("/tokens", function(req, res) {

  var code = req.query.code;
	
  console.log(code);

  oauth2Client.getToken(code, function(err, tokens) {
    if (err) {
      console.log(err);
      res.send(err);
      return;
    }
    console.log(tokens);
    oauth2Client.setCredentials(tokens);
    res.send(tokens);
  });
});


