/*
Module Dependencies 
*/
var google = require("googleapis");
var app = express();
var plus = google.plus({
  version: 'v1',
  auth: oauth2Client
});
var express = require('express'),
    path = require('path'),
    mongoose = require('mongoose'),
    hash = require('./pass').hash;

var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2("1033019170702-rve7g8nh21ekfkbcpk47113jf0td7enb.apps.googleusercontent.com", 
								"F_JnQG1fbbQ5bRxbuHd3p6E4", 
								"http://xamloz.com/projects/oauth_app/oauthcallback"
);

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
  'https://www.googleapis.com/auth/plus.login'
];

var url = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
  scope: scopes // If you only need one scope you can pass it as string
});
var User = mongoose.model('users', UserSchema);
var API_KEY = "AIzaSyAi9mcGJI1ef6A9j4Bn601f041ewxV4p6k";
/*
Database and Models
*/
mongoose.connect("mongodb://hoang:Hoangnguyen95@ds151222.mlab.com:51222/oauth_app");
var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    salt: String,
    hash: String
});

/*
Middlewares and configurations 
*/

var server = app.listen(8080, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});


app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.cookieParser('Authentication App '));
    app.use(express.session());
    app.use(express.static(path.join(__dirname, 'statics')));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
});

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


// Add headers to allow CORS
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
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

/*
Routes
*/
app.get("/", function (req, res) {

    if (req.session.user) {
        res.send("Welcome " + req.session.user.username + "<br>" + "<a href='/logout'>logout</a>");
    } else {
        res.render("main");
    }
});

app.get("/signup", function (req, res) {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("signup");
    }
});

app.post("/signup", userExist, function (req, res) {
    var password = req.body.password;
    var username = req.body.username;

    hash(password, function (err, salt, hash) {
        if (err) throw err;
        var user = new User({
            username: username,
            salt: salt,
            hash: hash,
        }).save(function (err, newUser) {
            if (err) throw err;
            authenticate(newUser.username, password, function(err, user){
                if(user){
                    req.session.regenerate(function(){
                        req.session.user = user;
                        req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                        res.redirect('/');
                    });
                }
            });
        });
    });
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", function (req, res) {
    authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {

            req.session.regenerate(function () {

                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('/');
            });
        } else {
            req.session.error = 'Authentication failed, please check your ' + ' username and password.';
            res.redirect('/login');
        }
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

app.get('/profile', requiredAuthentication, function (req, res) {
    res.send('Profile page of '+ req.session.user.username +'<br>'+' click to <a href="/logout">logout</a>');
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

var server = app.listen(8080, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
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


