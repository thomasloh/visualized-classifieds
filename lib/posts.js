var mongo = require('mongodb')
  , db = new mongo.Db('pixiphi', new mongo.Server('localhost', 27017, {auto_reconnect: true}, {}), {});


PostProvider = function(){
	this.db = db;
	this.db.open(function(){});
}

PostProvider.prototype.getCollection= function(callback) {
  this.db.collection('pixiphi', function(error, post_collection) {
    if( error ) callback(error);
    else callback(null, post_collection);
  });
};

PostProvider.prototype.findAll = function(callback) {
    this.getCollection(function(error, post_collection) {
      if( error ) callback(error)
      else {
        post_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else callback(null, results)
        });
      }
    });
};


PostProvider.prototype.findById = function(id, callback) {
    this.getCollection(function(error, post_collection) {
      if( error ) callback(error)
      else {
        post_collection.findOne({_id: post_collection.db.bson_serializer.ObjectID.createFromHexString(id)}, function(error, result) {
          if( error ) callback(error)
          else callback(null, result)
        });
      }
    });
};

PostProvider.prototype.save = function(post, callback) {
	console.log(post);
	db.close();
	db.open(function(err, db){
		
		db.collection('pixiphi.posts', function(err, collection){
			
			collection.insert({
				"caption": post.caption,
				// "imageUrl": post.filePath,
				"description": post.description,
				"price": post.price,
				"uploadDate": post.uploadDate,
				"category": post.category,
				"condition": post.condition,
				"location": post.location,
				"address": post.address,
				"latlng" :{
					"lat" : post.lat,
					"lng" : post.lng
				},
				"imgSrc": post.imgSrc,
				"oriDimSrc": post.oriDimSrc,
				"profPicUrl": post.profPicUrl,
				"author": {
					"name": post.authorName,
					"id": post.authorId
				}
			}, function(err, post){
				db.close()
				callback(null, post)
			})
		})
	})
	
	// var gs = new mongo.GridStore(db, post.filePath, "w",{
	// 	"metadata": {
	// 		"caption": post.caption,
	// 		"description": post.description,
	// 		"price": post.price,
	// 		"category": post.category,
	// 		"author": {
	// 			"name": post.authorName,
	// 			"id": post.authorId
	// 		}
	// 	},
	// });
	// gs.writeFile(post.filePath, function(err, gs){
	// 	db.close()
	// 	callback(null, gs)
	// })
	
};

exports.PostProvider = PostProvider;

