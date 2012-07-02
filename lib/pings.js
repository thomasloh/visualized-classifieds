var mongo = require('mongodb')
  , db = new mongo.Db('pixiphi', new mongo.Server('localhost', 27017, {auto_reconnect: true}, {}), {});


PingProvider = function(){
	this.db = db;
	this.db.open(function(){});
}

PingProvider.prototype.getCollection= function(callback) {
  this.db.collection('pixiphi', function(error, ping_collection) {
    if( error ) callback(error);
    else callback(null, ping_collection);
  });
};

PingProvider.prototype.findAll = function(callback) {
    this.getCollection(function(error, ping_collection) {
      if( error ) callback(error)
      else {
        ping_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else callback(null, results)
        });
      }
    });
};


PingProvider.prototype.findById = function(id, callback) {
    this.getCollection(function(error, ping_collection) {
      if( error ) callback(error)
      else {
        ping_collection.findOne({_id: ping_collection.db.bson_serializer.ObjectID.createFromHexString(id)}, function(error, result) {
          if( error ) callback(error)
          else callback(null, result)
        });
      }
    });
};

PingProvider.prototype.save = function(ping, callback) {
	db.close();
	db.open(function(err, db){
		
		db.collection('pixiphi.pings', function(err, collection){
			
			if(collection) {
				collection.insert({
					"fromUser": ping.fromUser,
					"toUser": ping.toUser,
					"message": ping.message,
					"postId": ping.postId,
					"timestamp": ping.timestamp
				}, function(err, ping){
					db.close()
					callback(null, ping)
				})
			}
			else {
				// if collection does not exists, create.
                db.createCollection("pixiphi.pings",
                function(err, collection) {
					collection.insert({
						"fromUser": ping.fromUser,
						"toUser": ping.toUser,
						"message": ping.message,
						"postId": ping.postId,
						"timestamp": ping.timestamp
					}, function(err, ping){
						db.close()
						callback(null, ping)
					})
                });
			}
			
		})
	})
	
};

exports.PingProvider = PingProvider;







