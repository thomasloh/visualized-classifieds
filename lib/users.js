var mongo = require('mongodb')
  , db = new mongo.Db('pixiphi', new mongo.Server('localhost', 27017, {}), {});


var findOrCreateUserByTwitter = function(twitterUserData){
	
	db.open(function(){
		
		db.collection('pixiphi.users', function(err, collection){
			collection.findOne({twitterId:twitterUserData["id_str"]}, function(err, doc){
				
				if (err){
					console.log("Error findOne user:")
					console.log(err)
					return
				}
				
				if (doc){
					db.close()
					return twitterUserData
				}
				else{
					var doc = {
						name: twitterUserData["name"],
						twitterId: twitterUserData["id_str"]
					};
					
					collection.insert(doc, function(err, result){
						if (err) {
							console.log("Error inserting user: ")
							console.log(err)
							return
						}
						console.log("New user inserted:" + twitterUserData["name"])
						db.close()
						return twitterUserData
					})
				}
			})
		})
	})
}

exports.findOrCreateUserByTwitter = findOrCreateUserByTwitter


