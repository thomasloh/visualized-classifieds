/**
 * Module dependencies.
 */

var express = require('express')
,
// , routes = require('./routes')
everyauth = require('everyauth')
,
util = require('util')
,
users = require('./lib/users')
,
posts = require('./lib/posts')
,
pings = require('./lib/pings')
,
http = require('http')
,
qs = require('querystring')
,
fs = require('fs')
,
url = require('url')
,
mime = require('mime')
,
easyimg = require('easyimage')
,
mongo = require('mongodb')
,
bson = mongo.BSONPure
,
db = new mongo.Db('pixiphi', new mongo.Server('localhost', 27017, {
    auto_reconnect: false,
    poolSize: 1
}), {
    native_parser: false
});

everyauth.twitter
.consumerKey('hcGvLrgjylKwEjrJxnO0w')
.consumerSecret('pdxlXpBJntpjD01vNTjZQuDYGQUEFdKX3eTe92aZUg')
.handleAuthCallbackError(function(req, res) {
    res.redirect('/');
})

.findOrCreateUser(function(session, accessToken, accessTokenSecret, twitterUserData) {
    // console.log(util.inspect(twitterUserData))
    users.findOrCreateUserByTwitter(twitterUserData);
    return twitterUserData;
})
.redirectPath('/');

var app = module.exports = express.createServer();

// Configuration
app.configure(function() {
    // app.set('views', __dirname + '/views');
    // app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: "something"
    }));
    app.use(everyauth.middleware());
    app.use(app.router);
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
    app.use('/', express.errorHandler({
        dump: true,
        stack: true
    }));
});



everyauth.helpExpress(app)

 app.configure('development',
function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production',
function() {
    app.use(express.errorHandler());
});

// Routes
var postProvider = new posts.PostProvider();
var pingProvider = new pings.PingProvider();

 app.get('/',
function(req, res) {
	
    res.render('index', {
        // title: 'Pixiphi'
        title: 'Classifieds'
    });
})

 app.get('/signup',
function(req, res) {
	
	res.send("Coming Soon");
	
})


 app.get('/comingsoon',
function(req, res) {

    res.send("Coming Soon.");
})

// Socket.io server
 var io = require('socket.io').listen(app)
 // io.configure(function () { 
 //   io.set("transports", ["xhr-polling"]); 
 //   io.set("polling duration", 10); 
 // });

 io.sockets.on('connection',
function(socket) {


    /*
	* post:create
	*
	* called when we .save() our new post
	* 
	*/

    socket.on('post:create',
    function(data, callback) {

        postProvider.save({
            // filePath: name,
            caption: data.caption,
            description: data.description,
            price: data.price,
            category: data.category,
            uploadDate: data.uploadDate,
            condition: data.condition,
            location: data.location,
            address: data.address,
            lat: data.lat,
            lng: data.lng,
            imgSrc: data.imgSrc,
			oriDimSrc: data.oriDimSrc,
            profPicUrl: data.profPicUrl,
            authorName: data.authorName,
            authorId: data.authorId
        },
        function(err, post) {
            // callback
            socket.emit('posts:create', post);
            socket.broadcast.emit('posts:create', post);
        }
        );

    });

    /*
	* posts:read
	*
	* called when we .fetch our new post
	* in the client-side router
	*/

    socket.on('posts:read',
    function(data, callback) {

		db.close();
        db.open(function(err, db) {
            db.collection('pixiphi.posts', {
                safe: true
            },
            function(err, collection) {

                // if collection exists, read.
                if (collection) {
                    collection.find({
                        "location": data.city
                    }).toArray(function(err, docs) {
                        db.close();
                        callback(null, docs)
                    })
                }
                else {
                    // if collection does not exists, create.
                    db.createCollection("pixiphi.posts",
                    function(err, collection) {
                        db.close();
                    });
                }
            })
        })

    });

    /*
	* posts:update
	*
	* called when we .save() our new post
	* when user edits their post
	*/

    socket.on('posts:update',
    function(postByMe, callback) {
        // update on mongodb
        var fileName = postByMe.filename
        var targetAttribute = postByMe.targetAttribute
        var targetValue = postByMe.targetValue
        var oid = new bson.ObjectID(postByMe.id)

        switch (postByMe.type) {
        case "caption":
            {
                db.open(function(err, db) {

                    db.collection('pixiphi.posts',
                    function(err, collection) {
                        collection.update({
                            _id: oid
                        },
                        {
                            $set: {
                                "caption": targetValue
                            }
                        },
                        {
                            safe: true
                        },
                        function(err, data) {
                            console.log(data)
                            db.close();

                            // socket.emit('posts:update', postByMe);
                            socket.broadcast.emit('posts:update', postByMe);
                            // callback(null, postByMe);
                        })
                    })
                })

                break;
            }
        case "price":
            {
                db.open(function(err, db) {

                    db.collection('pixiphi.posts',
                    function(err, collection) {
                        collection.update({
                            _id: oid
                        },
                        {
                            $set: {
                                "price": targetValue
                            }
                        },
                        {
                            safe: true
                        },
                        function(err, data) {
                            console.log(data)
                            db.close();

                            // socket.emit('posts:update', postByMe);
                            socket.broadcast.emit('posts:update', postByMe);
                            // callback(null, postByMe);
                        })
                    })
                })

                break;
            }
        case "description":
            {
                db.open(function(err, db) {

                    db.collection('pixiphi.posts',
                    function(err, collection) {
                        collection.update({
                            _id: oid
                        },
                        {
                            $set: {
                                "description": targetValue
                            }
                        },
                        {
                            safe: true
                        },
                        function(err, data) {
                            console.log(data)
                            db.close();

                            // socket.emit('posts:update', postByMe);
                            socket.broadcast.emit('posts:update', postByMe);
                            // callback(null, postByMe);
                        })
                    })
                })

                break;
            }
        case "category":
            {
                db.open(function(err, db) {

                    db.collection('pixiphi.posts',
                    function(err, collection) {
                        collection.update({
                            _id: oid
                        },
                        {
                            $set: {
                                "category": targetValue
                            }
                        },
                        {
                            safe: true
                        },
                        function(err, data) {
                            console.log(data)
                            db.close();

                            // socket.emit('posts:update', postByMe);
                            socket.broadcast.emit('posts:update', postByMe);
                            // callback(null, postByMe);
                        })
                    })
                })

                break;
            }
        }

        // socket.emit('posts/' + data.id + ':update', json);
        // socket.broadcast('posts/' + data.id + ':update', json);
        // callback(null, json);
    });

    /*
	* posts:delete
	*
	* called when we .destroy our posts
	* 
	*/

    socket.on('posts:delete',
    function(postByMe, callback) {
        var oid = new bson.ObjectID(postByMe.id)

        // delete on mongodb
        db.open(function(err, db) {

            db.collection('pixiphi.posts',
            function(err, collection) {
                collection.remove({
                    _id: oid
                },
                {
                    safe: true
                },
                function(err, data) {
                    db.close();
                    socket.emit('posts:delete', postByMe);
                    socket.broadcast.emit('posts:delete', postByMe);
                    callback(null, postByMe);
                })
            })
        })
    });

	// Pings

	// create pings
	socket.on('ping:create',
	function(data, callback) {

		pingProvider.save({
			"fromUser": data.fromUser,
			"toUser": data.toUser,
			"message": data.message,
			"postId": data.postId,
			"timestamp": data.timestamp
		},
		function(err, ping) {
			if (err) console.log(err);
			// callback(null, ping);
			socket.emit('pings:create', ping);
            socket.broadcast.emit('pings:create', ping);
		});

	});
	
	// read pings
    socket.on('pings:read',
    function(data, callback) {
		
		db.open(function(err, db) {
            db.collection('pixiphi.pings', {
                safe: true
            },
            function(err, collection) {

                // if collection exists, read.
                if (collection) {
                    collection.find({
						$or : [ {"fromUser.id": data.user.id}, {"toUser.id": data.user.id}] 
					}).toArray(function(err, pings) {
                        db.close();
                        callback(null, pings)
                    })
                }
				else {
				    // if collection does not exists, create.
                    db.createCollection("pixiphi.pings",
                    function(err, collection) {
                        db.close();
                    });
				}
            });
        });
		
		// 
		// if (db) {
		// 	db.collection('pixiphi.pings', {
		//                 safe: true
		//             },
		//             function(err, collection) {
		// 
		//                 // if collection exists, read.
		//                 if (collection) {
		//                     collection.find({
		// 				$or : [ {"fromUser.id": data.user.id}, {"toUser.id": data.user.id}] 
		// 			}).toArray(function(err, pings) {
		//                         db.close();
		//                         callback(null, pings)
		//                     })
		//                 }
		// 		else {
		// 		    // if collection does not exists, create.
		//                     db.createCollection("pixiphi.pings",
		//                     function(err, collection) {
		//                         db.close();
		//                     });
		// 		}
		//             });
		// }
		// else {
		// }
		
    });

    //Helper for previewing thumbnails
    socket.on('thumbnail-preview',
    function(data, callback) {

        console.log(data);

        // console.log(data)
        var pix = data["img-src"].split(';base64,')

        var type = pix[0].substr(5)
        var ext = type.split('/')[1]

        pix = new Buffer(pix[1], 'base64').toString('binary');

		var name = './public/uploads/' + +new Date + '.' + ext
        var profName = './public/uploads/' + +new Date + '-profile.' + ext
        var thumbnailName = './public/uploads/' + +new Date() + '-thumbnail.' + ext;
        var actual = './public/uploads/' + +new Date() + '-actual.' + ext;

        fs.writeFile(name, pix, 'binary',
        function(err) {

            easyimg.resize({
                src: name,
                dst: thumbnailName,
                width: 160,
                height: 175
            },
            function(err, stdout, stderr) {
                if (err) throw err;
	            easyimg.resize({
	                src: name,
	                dst: profName,
	                width: 360,
	                height: 500
	            },
	            function(err, stdout, stderr) {
	                if (err) throw err;
		            easyimg.resize({
		                src: name,
		                dst: actual,
		                width: 700,
		                height: 600
		            },
		            function(err, stdout, stderr) {
		                if (err) throw err;
						callback(err, [profName, thumbnailName, actual]);
		            });
	                // callback(err, [name, thumbnailName]);
	            });
                // callback(err, [name, thumbnailName]);
            });
        });
    });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
































