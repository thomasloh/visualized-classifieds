// Socket IO
window.socket = io.connect('http://localhost');
// window.socket = io.connect('http://furious-samurai-2226.herokuapp.com/');

// Namespace
var Pixiphi = {};

// ------------------------------------------------------------------------------------------
// Router
// ------------------------------------------------------------------------------------------
// App router
Pixiphi.App = Backbone.Router.extend({

    routes: {
        '/category>:category': 'showPostsByCategory',
        // '/pings': 'showPings',
        '/postsByYou': 'showYourPosts',
        '/:city': 'navigateToCityPosts',
        '': 'index'
    },

    showPostsByCategory: function(category) {

        window.app.page.currentPage = "showPostsByCategory";

        window.app.navigate("//" + window.app.userCity + "/category>" + category, {
            trigger: false,
            replace: true
        });

        // track current page
        if (typeof window.app.postsByCategoryGrid != 'undefined') {
            window.app.postsByCategoryGrid.remove();
        }

        // select posts in chosen category
        var postsByCategory = _.filter(window.app.postsGrid.posts.models,
        function(model) {
            return model.attributes.category == category
        })

        // now load posts by chosen category
        if (typeof postsByCategory != 'undefined') {
            // create a new view instance and pass the filtered collection
            // $('#PostsGridWrapper').empty();
            window.app.page.hideAllGrids();
            $('#welcomeHero').hide();

            // declare new collection of posts by category
            var postsByCategoryCollection = new Pixiphi.Posts(postsByCategory);

            // attach to app
            window.app.postsByCategoryGrid = new Pixiphi.PostsGrid(postsByCategoryCollection, 'PostByCategoryGrid', false)
            $('#PostsGridWrapper').append(window.app.postsByCategoryGrid.el);
            $("img.home").hover_caption({
                caption_font_size: '18px',
                caption_color: 'white',
                caption_bold: true,
                caption_default: "Click for screenshots."
            },
            window.app.thisUserSubmittedPost);
        }

    },

    showYourPosts: function() {

        // window.app.navigate("//" + window.app.userCity + "/postsByYou", {
        //     trigger: false,
        //     replace: true
        // });
        
        // window.app.navigate("//postsByYou" + "/" + window.app.userCity, {
        //     trigger: false,
        //     replace: true
        // });

        if ($('#PostsGridWrapper').find("#PostByMeGrid").length == 1) return;

        // window.location = "/#/yourposts"
        // track current page
        window.app.page.currentPage = "showPostsByMe";

        // Get all posts from current logged in user
        var postsByMe = _.filter(window.app.postsGrid.posts.models,
        function(model) {
            return model.attributes.author.name == $('#userName').html();
        });
        
        // If the user posted something, show all posts by him/her
        if (typeof(postsByMe) != 'undefined') {
            // create a new view instance and pass the filtered collection
            window.app.page.hideAllGrids();
            window.app.page.removeCategoryInfo();
            // $("#PostGrid").remove()
            $('#welcomeHero').hide();
            // $('#PostsGridWrapper').empty();
            // $('#categoryNavPill').hide();
            //post hero unit
            $("#postsByMeHero").remove();
            var postsByMeHero = _.template($('#postsByMeHeroTemplate').html(), {});
            // $('#categoryNavPill').after(postsByMeHero);
            $('#loadMoreButtonGroup').after(postsByMeHero);

            // declare new collection of posts by me
            var postsByMeCollection = new Pixiphi.Posts(postsByMe);

            // attach to app
            window.app.postsByMeGrid = new Pixiphi.PostsGrid(postsByMeCollection, 'PostByMeGrid', true);
            $('#PostsGridWrapper').append(window.app.postsByMeGrid.el);

        }
        else {
            // Show a message saying the user has not posted anything yet
            var noPostByMe = _.template($('#noPostsByMe').html());
            this.hideAllGrids();
            $('#PostsGridWrapper').append(noPostByMe);
        }

    },

    navigateToCityPosts: function(city) {

        if ($("#PostsGridWrapper").find("#PostByCategoryGrid").length > 0) return;

        // Get POSTS
        // --------------------------------------------------------
        // declare new collection of posts
        var posts = new Pixiphi.Posts();

        // update dropdown
        if ($("#cityDropDown").children().length === 0 || window.app.page.currentCity != city) {

            window.app.page.updateCityDropdown(city);
        }

        // track
        window.app.page.currentPage = "allPosts";

        // declare a new grid instance that holds all collections
        window.app.postsGrid = new Pixiphi.PostsGrid(posts, 'PostGrid', false);

        // show appropriate banners
        $("#welcomeHero").show();
        $("#postsByMeHero").remove();

        // show it on UI
        $('#PostsGridWrapper').empty().append(window.app.postsGrid.el);

        window.app.userCity = city;

        // get all posts from server by city
        posts.fetch({
            data: {
                city: window.app.userCity
            }
        });

    },

    index: function() {

        var self = this;

        // Grab user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function success(position) {
                var geocoder = new google.maps.Geocoder();
                var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                window.app.latlng = latlng;
                geocoder.geocode({
                    'latLng': latlng
                },
                function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        if (results[1]) {
                            window.app.userAddress = results[1].formatted_address;
                            window.app.userCityDisplay = results[1].address_components[1].long_name;
                            window.app.userState = results[1].address_components[3].short_name;
                            window.app.userCity = results[1].address_components[1].long_name.toLowerCase().replace(" ", "");
                            // window.app.userCity = window.app.userCity.toLowerCase().replace(" ", "")
                            if (_.indexOf(window.app.initialCities, window.app.userCityDisplay) == -1) {
                                window.location = "/comingsoon";
                            }

                            window.location = "/#/" + window.app.userCity;


                        }
                    } else {
                        console.log("Geocoder failed due to: " + status);
                    }
                });

            }
            );
        }
        else {
            console.log("Not supported");
        }

    }
});

// ------------------------------------------------------------------------------------------
// Models / Collections
// ------------------------------------------------------------------------------------------
// Post Model
Pixiphi.Post = Backbone.Model.extend({
    urlRoot: 'post',
    noIoBind: false,
    socket: window.socket,
    initialize: function() {
        _.bindAll(this, 'serverChange', 'serverDelete', 'modelCleanup');

        if (!this.noIoBind) {
            this.ioBind('update', this.serverChange, this);
            this.ioBind('delete', this.serverDelete, this);
        }
    },
    serverChange: function(data) {
        if (this.attributes._id == data.id) {

            switch (data.targetAttribute) {

            case "caption":
                {
                    this.attributes.caption = data.targetValue;
                    break;
                }
            case "price":
                {
                    this.attributes.price = data.targetValue;
                    break;
                }
            case "description":
                {
                    this.attributes.description = data.targetValue;
                    break;
                }
            case "category":
                {
                    this.attributes.category = data.targetValue;
                    break;
                }
            case "condition":
                {
                    this.attributes.condition = data.targetValue;
                    break;
                }
            }
            this.trigger("serverChange");
        }
    },
    serverDelete: function(data) {
        if (this.attributes._id == data.id) {
            this.collection.remove(this);
            this.modelCleanup();
        }
    },
    modelCleanup: function() {
        this.ioUnbindAll();
        return this;
    }
});

// Posts Collections
Pixiphi.Posts = Backbone.Collection.extend({

    model: Pixiphi.Post,
    url: 'posts',
    socket: window.socket,
    initialize: function() {
        _.bindAll(this, 'serverCreate', 'collectionCleanup');
        this.ioBind('create', this.serverCreate, this);
    },
    serverCreate: function(data) {

        // add to queue
        window.app.postsGrid.postsQueue.push(data);
        window.app.postsGrid.postsQueue = _.uniq(window.app.postsGrid.postsQueue);

        $('#loadMoreButtonGroup').show();
        $('#loadMoreButton').html("Load " + window.app.postsGrid.postsQueue.length + " more...");

    },
    collectionCleanup: function(callback) {
        this.ioUnbindAll();
        this.each(function(model) {
            model.modelCleanup();
        });
    }
});

// Ping Model
Pixiphi.Ping = Backbone.Model.extend({
    urlRoot: 'ping',
    noIoBind: false,
    socket: window.socket,
    initialize: function() {
        _.bindAll(this, 'serverDelete', 'modelCleanup');

        if (!this.noIoBind) {
            // this.ioBind('update', this.serverChange, this);
            this.ioBind('delete', this.serverDelete, this);
        }
    },
    serverDelete: function(data) {
        if (this.attributes._id == data.id) {
            this.collection.remove(this);
            this.modelCleanup();
        }
    },
    modelCleanup: function() {
        this.ioUnbindAll();
        return this;
    }
});

// Pings Collections
Pixiphi.Pings = Backbone.Collection.extend({

    model: Pixiphi.Ping,
    url: 'pings',
    socket: window.socket,
    initialize: function(main) {
        if (main) {
            _.bindAll(this, 'serverCreate', 'collectionCleanup');
            this.ioBind('create', this.serverCreate, this);
        }
    },
    serverCreate: function(data) {
        this.add(data)
    },
    collectionCleanup: function(callback) {
        this.ioUnbindAll();
        this.each(function(model) {
            model.modelCleanup();
        });
    }
});

// ------------------------------------------------------------------------------------------
//  VIEWS
// ------------------------------------------------------------------------------------------
// Post Grid View
Pixiphi.PostsGrid = Backbone.View.extend({
    initialize: function(posts, id, showPostsByMe) {
        _.bindAll(this, 'render', 'addPost', 'removePost');
        this.el.id = id;
        this.posts = posts;
        this.posts.comparator = function(post) {
            return - post.get("uploadDate");
        };
        this.showPostsByMe = showPostsByMe;
        this.postsQueue = [];

        // called upon fetch
        this.posts.bind('reset', this.render);

        // called when collection adds a new post from server
        this.posts.bind('add', this.addPost);

        // called when a collection is told to remove a post
        this.posts.bind('remove', this.removePost);

        this.render();
    },
    render: function() {

        // do something if there's no posts in cities
        var self = this;
        self.$el.empty();
        var showPostsByMe = self.showPostsByMe;

        var postCount = 0;
        _.each(this.posts.models,
        function(post) {
            if (postCount % 4 === 0) {
                if (showPostsByMe) {
                    $(self.el).append("<div class=\"row\"></div>");
                }
                else {
                    $(self.el).append("<div class=\"row\"></div>");
                }
            }
            self.addPost(post);
            postCount++;
        });

        // update search bar data store
        this.updateSearchBarDataStore(this.posts.models);

        // get user submitted posts image url
        window.app.thisUserSubmittedPost = [];
        _.each(this.posts.models,
        function(post) {
            if (post.attributes.author.id == $('#userId').html()) {
                window.app.thisUserSubmittedPost.push(post.attributes.imageUrl);
            }
        });

        if (this.posts.length > 0) {
            $("img.home").hover_caption({
                caption_font_size: '18px',
                caption_color: 'white',
                caption_bold: true,
                caption_default: "Click for screenshots."
            },
            window.app.thisUserSubmittedPost);
        }

        return this;

    },
    updateSearchBarDataStore: function(posts) {
        // update search bar data source
        var keywords = _.pluck(_.pluck(posts, "attributes"), "caption");

        // construct string
        var dataString = "";
        // dataString += "["
        _.each(keywords,
        function(keyword) {
            dataString += "\"" + keyword + "\",";
        });
        // dataString += "]"
        var keywordsWithCommas = dataString.split(",");
        keywordsWithCommas.pop();

        dataString = "[" + keywordsWithCommas.join(",") + "]";

        $('#searchBar').attr("data-source", dataString);

    },
    addPost: function(post) {
        // prepare a grid item
        var pgv;
        if (this.showPostsByMe) {
            pgv = new Pixiphi.PostByMeGridItem(post, this.showPostsByMe);

        }
        else {
            pgv = new Pixiphi.PostGridItem(post, this.showPostsByMe);
        }

        $(this.el).append(pgv.el);

    },
    removePost: function(post) {
        // remove from view by re-rendering
        // window.app.postsByMeGrid.render();
        // $($("#" + post.cid)[0]).remove();
        window.app.page.showPostsByMe();
    }
});

// PostGridItemView
Pixiphi.PostGridItem = Backbone.View.extend({
    tagName: 'div',
    className: 'span4',
    events: {
        'click #postDetails': 'showPostDetails',
        'click #ping': 'pingItem'
    },
    initialize: function(post, showPostsByMe) {
        _.bindAll(this, 'updatePost');
        this.post = post;
        this.showPostsByMe = showPostsByMe;
        // this.post.bind("change", this.updatePost);
        this.post.on("serverChange", this.updatePost);
        this.render();
    },
    updatePost: function() {
        // update post view
        this.render();
    },
    render: function() {

        // trim image url
        this.post.attributes.imageUrl = this.post.attributes.profPicUrl.replace("./public", "");

        // update type
        type = this.post.attributes.imageUrl.split('.')[1];
        type = type == 'jpg' ? 'jpeg' : type;

        var post = this.post.attributes;

        // Map img config
        var width = 540;
        var height = 330;
        var scale = 2;
        var zoom = 11;
        var mapImgUrl;
        // if user provided location
        if (post.latlng.lat === "" && post.latlng.lng === "") {
            // address
            var addressArray = this.attributes.address.split(",");
            var addressString = "";

            _.each(addressArray,
            function(a) {
                // return $.trim(a);
                addressString += a.replace(/\W/g, "+");
            });
            //maps.googleapis.com/maps/api/staticmap?path=color:0x0000ff%7Cweight:5%7C40.737102,-73.990318%7C40.749825,-73.987963%7C40.752946,-73.987384%7C40.755823,-73.986397&size=512x512&sensor=false
            // var path = "color:0x0000ff%7Cweight:5%7C"+ window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7CaddressString"
            mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?center=" + addressString + "&zoom=" + zoom + "&size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C%7C" + addressString + "&sensor=false";
            // var mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C" + window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7C" + addressString + "&sensor=false";
        }
        else {
            // latlng
            var lat = post.latlng.lat;
            var lng = post.latlng.lng;
            // var path = "color:0x0000ff%7Cweight:5%7C"+ window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7C" + lat + "," + lng;
            mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lng + "&zoom=" + zoom + "&size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C%7C" + lat + "," + lng + "&sensor=false";
        }

        this.post.imgMap = new Image();
        this.post.imgMap.src = mapImgUrl;

        var self = this;
        this.post.attributes.imgSrcLoaded = []
        _.each(this.post.attributes.imgSrc,
        function(src) {
            var img = new Image();
            img.src = src.replace("./public", "");
            self.post.attributes.imgSrcLoaded.push(img.src);
        });

        this.post.attributes.oriDimSrcLoaded = []
        _.each(this.post.attributes.oriDimSrc,
        function(src) {
            var img = new Image();
            img.src = src.replace("./public", "");
            self.post.attributes.oriDimSrcLoaded.push(img.src);
        });

        var relativeTime = new Date(this.post.attributes.uploadDate).toRelativeTime();

        var template = _.template($("#postItemTemplate").html(), {
            caption: this.post.attributes.caption,
            description: this.post.attributes.description,
            price: this.post.attributes.price,
            author: this.post.attributes.author.name,
            category: this.post.attributes.category,
            // authorId : this.post.attributes.authorId,
            when: relativeTime,
            type: type

        });
        $(this.el).html(template);

        // var img = this.el.getElementsByTagName('img');
        var img = $(this.el).find("img")[0];
        $(img).attr("src", this.attributes.imageUrl);
        img.style.height = "360px";
        img.style.width = "360px";

        // remove attr in div
        var attLen = this.el.attributes.length;
        while (attLen--) {
            var attr = this.el.attributes[attLen];
            if (attr.nodeName != "class") {
                this.el.attributes.removeNamedItem(attr.nodeName);
            }
        }

        return this;
    },
    showPostDetails: function(e) {

        // remove existing
        $("#postItemModal").remove();

        // grab post details
        var post = this.attributes;

        // Map img config
        var width = 640;
        var height = 430;
        var scale = 2;
        // var zoom = 11;
        // var mapImgUrl;
        // // if user provided location
        // if (post.latlng.lat === "" && post.latlng.lng === "") {
        //     // address
        //     var addressArray = this.attributes.address.split(",");
        //     var addressString = "";
        //
        //     _.each(addressArray,
        //     function(a) {
        //         // return $.trim(a);
        //         addressString += a.replace(/\W/g, "+");
        //     });
        //     //maps.googleapis.com/maps/api/staticmap?path=color:0x0000ff%7Cweight:5%7C40.737102,-73.990318%7C40.749825,-73.987963%7C40.752946,-73.987384%7C40.755823,-73.986397&size=512x512&sensor=false
        //     // var path = "color:0x0000ff%7Cweight:5%7C"+ window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7CaddressString"
        //     mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?center=" + addressString + "&zoom=" + zoom + "&size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C%7C" + addressString + "&sensor=false";
        //     // var mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C" + window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7C" + addressString + "&sensor=false";
        // }
        // else {
        //     // latlng
        //     var lat = post.latlng.lat;
        //     var lng = post.latlng.lng;
        //     // var path = "color:0x0000ff%7Cweight:5%7C"+ window.app.latlng.lat() + "," + window.app.latlng.lng() + "%7C" + lat + "," + lng;
        //     mapImgUrl = "http://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lng + "&zoom=" + zoom + "&size=" + width + "x" + height + "&scale=" + scale + "&maptype=roadmap&markers=color:red%7C%7C" + lat + "," + lng + "&sensor=false";
        // }
        // Append map img
        // var imgDiv = document.createElement("div");
        // $(imgDiv).attr("style", "background: -webkit-radial-gradient(bottom left, ellipse cover, rgba(255,255,255,0.2) 0%,rgba(0,0,0,0.5) 50%), url(" + mapImgUrl+ ") repeat; width: " + width*scale + "px; height: " + height*scale + "px;");
        // var postDetail = $(".post-detail")[0];
        // $(postDetail).append(imgDiv);
        $("#postItemMapImgModal").attr("style", "background: -webkit-radial-gradient(top left, ellipse cover, rgba(255,255,255,0.2) 0%,rgba(0,0,0,0.4) 45%), url(" + this.post.imgMap.src + ") no-repeat; width: " + width * scale + "px; height: " + height * scale + "px;");
        $("#postItemMapImgModal").reveal({
            animation: 'none',
            //fade, fadeAndPop, none
            animationspeed: 200,
            //how fast animtions are
            closeonbackgroundclick: false,
            //if you click background will modal close?
            dismissmodalclass: 'close-reveal-modal'
            //the class of a button or element that will close an open modal
        });

        // append item details
        var postItemDetail = _.template($("#postItemDetailModalTemplate").html(), {
            "Caption": post.caption,
            "Price": "$" + post.price,
            "Description": post.description,
            "Category": post.category,
            "Location": post.address,
            "Condition": post.condition,
            "When": new Date(post.uploadDate).toRelativeTime()
        });
        $("#postItemMapImgModal").append(postItemDetail);

        // reveal item modal
        $("#postItemModal").reveal({
            // animation: 'fade',
            animation: 'none',
            animationspeed: 200,
            closeonbackgroundclick: false
        });

        // add the rest of the images
        var divRow = document.createElement("div");
        $(divRow).addClass("row");
        $(divRow).addClass("photo-nailthumb-holder");
        var index = 1;
        _.each(post.imgSrcLoaded,
        function(src) {

            var divPhoto = document.createElement("div");
            $(divPhoto).addClass("photo");
            // $(divPhoto).addClass("photo-nailthumb-img");
            // $(divPhoto).attr("style", "background: url(" + src.replace("./public", "") + ") no-repeat; width: 150px; height: 100px");
            var aPhoto = document.createElement("a");
            $(aPhoto).attr("href", "#" + post.caption.replace(" ", "") + index);

            var imgSrc = document.createElement("img");
            $(imgSrc).attr("src", src.replace("./public", ""));
            imgSrc.style.width = "50px";
            imgSrc.style.height = "50px";
            $(imgSrc).addClass("photo-nailthumb-img");

            $(aPhoto).append(imgSrc);
            $(divPhoto).append(aPhoto);
            // $(divPhoto).addClass("hide");
            var divSpan = document.createElement("div");
            $(divSpan).addClass("span1");
            $(divSpan).addClass("photo-nailthumb");

            $(divSpan).append(divPhoto);
            $(divRow).append(divSpan);

            // $(divRow).append(divPhoto);
            // $("div.item-pictures").append(divPhoto);
            index++;
        })

        $("div.item-pictures").append(divRow);

        index = 1;
        _.each(post.oriDimSrcLoaded,
        function(src) {
            var divPhoto = document.createElement("div");
            $(divPhoto).attr("id", post.caption.replace(" ", "") + index);

            var imgSrc = document.createElement("img");
            $(imgSrc).attr("src", src.replace("./public", ""));
            $(divPhoto).append(imgSrc);

            $("div.item-pictures").append(divPhoto);
            index++;
        })


        $("div.photo a").fancyZoom({
            scaleImg: true,
            closeOnClick: false
        });

        // make web page unscrollable until user hits close
        // this.manageScrolls(false);
        window.app.page.manageScrolls(false);

    },
    pingItem: function(e) {

        var thisItem = $($(e.currentTarget).closest(".active.item")).find(".caption-tag").html()
        
        var Ping = Pixiphi.Ping.extend({
            noIoBind: true
        });

        // get relevant info
        var fromUser = {
            "name": $('#userName').html(),
            "id": $('#userId').html()
        }
        var toUser = {
            "name": this.post.attributes.author.name,
            "id": this.post.attributes.author.id,
        }
        var postId = this.post.attributes._id;

        var attr = {
            fromUser: fromUser,
            toUser: toUser,
            message: "",
            postId: postId,
            timestamp: +new Date()
        }

        var _ping = new Ping(attr);
        
        window.app.tempPing = _ping;
        
        var pinger = _.template($("#pingItemBoxTemplate").html(), {
            "toUser": toUser.name,
            "caption": thisItem
        })
        
        $("body").append(pinger);
        
        $("#pingItemBox").modal("show");
        
        $("input.span5.pingItemPinger").focus();
        
        $("#pingItemBox").on("hidden", function() {
            $("input.span5.pingItemPinger").val("");
            window.app.tempPing = null;
        })
        
        // Show ping box
        // window.app.page.showPings();
        // 
        // // create new thread
        // var newthread = {
        //     "targetUser": toUser,
        //     "targetPostId": postId,
        //     "pingItems": []
        // }
        // 
        // // add thread
        // window.app.pingBox.addThread(newthread);
        // 
        // // open that thread
        // window.app.pingBox.threads[newthread.targetUser.id].openPingDialog();
        
        // allow the user to send a ping
        // $("h3.noPingsYet.hide").hide();
        
        // if cancel, delete this thread
        
    }
});

// PostGridItemView
Pixiphi.PostByMeGridItem = Backbone.View.extend({
    tagName: 'div',
    className: 'span4',
    events: {
        'click #deletePostByMe': 'deletePostByMe',
        'click #deletePostTrigger': 'showDeleteAlert',
        'click #cancelDelete': 'cancelDelete',
        'mouseenter .carousel-caption': 'editPost',
        'mouseleave .carousel-caption': 'uneditPost',
        'blur .captionInput': 'changeCaption',
        'blur .descInput': 'changeDesc',
        'blur .priceInput': 'changePrice',
        'blur .categoryInput': 'changeCategory',
        'blur .descInput': 'changeDesc',
        'blur .conditionInput': 'changeCondition',
        'click #editMore': 'showMoreEdit'

    },
    initialize: function(post, showPostsByMe) {
        this.post = post;
        this.showPostsByMe = showPostsByMe;
        this.render();
        $($(this.el)[0]).attr("id", post.cid);

        // push for bindings
        window.app.observedModel["caption_display_" + this.post.cid] = this.post.attributes.caption;
        window.app.observedModel["price_display_" + this.post.cid] = "$" + this.post.attributes.price;
        window.app.observedModel["category_display_" + this.post.cid] = this.post.attributes.category;

    },
    render: function() {

        // trim image url
        this.post.attributes.imageUrl = this.post.attributes.profPicUrl.replace("./public", "");

        // update type
        type = this.post.attributes.imageUrl.split('.')[1];
        if (type == 'jpg') {
            type = 'jpeg';
        }

        var relativeTime = new Date(this.post.attributes.uploadDate).toRelativeTime();

        var template = _.template($("#postByMeItemTemplate").html(), {
            caption: this.post.attributes.caption,
            description: this.post.attributes.description,
            price: "$" + this.post.attributes.price,
            author: this.post.attributes.author.name,
            category: this.post.attributes.category,
            // authorId : this.post.attributes.authorId,
            when: relativeTime,
            type: type
            // base64: this.post.attributes.base64
        });
        $(this.el).html(template);

        // display image
        var img = $(this.el).find("img")[0];
        $(img).attr("src", this.attributes.imageUrl);
        img.style.height = "370px";
        img.style.width = "360px";

        var carousel = this.el.getElementsByClassName('carousel-caption');

        // set binding for caption
        var captionEl = $($(carousel).find("h4.caption-tag"));
        captionEl.attr("data-bind", "text: caption_display_" + this.post.cid);

        // set binding for price
        var priceEl = $($(carousel).find("h4.price-tag"));
        priceEl.attr("data-bind", "text: price_display_" + this.post.cid);

        // set binding for category
        var categoryEl = $($(carousel).find("h4.category-tag"));
        categoryEl.attr("data-bind", "text: category_display_" + this.post.cid);

        // remove attr in div
        var attLen = this.el.attributes.length;
        while (attLen--) {
            var attr = this.el.attributes[attLen];
            if (attr.nodeName != "class") {
                this.el.attributes.removeNamedItem(attr.nodeName);
            }
        }

        return this;


    },
    changeCaption: function() {

        var userInputCaption = $('.captionInput').val();

        if (userInputCaption) {

            // update model(server sync)
            this.post.attributes.caption = userInputCaption;

            // update model(view sync)
            window.app.observedModel["caption_display_" + this.post.cid] = ko.observable(userInputCaption);

            // update db
            socket.emit('posts:update', {
                "id": this.post.attributes._id,
                "targetAttribute": "caption",
                "targetValue": userInputCaption,
                "type": "caption"
            },
            function(err, data) {
                console.log(data);
            });

        }


    },
    changePrice: function() {
        var userInputPrice = $('.priceInput').val();

        if (userInputPrice) {

            // update model(server sync)
            this.post.attributes.price = userInputPrice;

            // update model(view sync)
            window.app.observedModel["price_display_" + this.post.cid] = ko.observable("$" + userInputPrice);

            // update db
            socket.emit('posts:update', {
                "id": this.post.attributes._id,
                "targetAttribute": "price",
                "targetValue": userInputPrice,
                "type": "price"
            },
            function(err, data) {
                console.log(data);
            });
        }

    },
    changeDesc: function() {

        var userInputDesc = $('.descInput').val();

        if (userInputDesc) {

            // update model(server sync)
            this.post.attributes.description = userInputDesc;

            // update model(view sync)
            window.app.observedModel["description_display_" + this.post.cid] = ko.observable(userInputDesc);

            // update db
            socket.emit('posts:update', {
                "id": this.post.attributes._id,
                "targetAttribute": "description",
                "targetValue": userInputDesc,
                "type": "description"
            },
            function(err, data) {
                // console.log(data);
                });

        }
    },
    changeCategory: function() {

        var userInputCategory = $('.categoryInput').val();

        if (userInputCategory) {

            // update model(server sync)
            this.post.attributes.category = userInputCategory;

            // update model(view sync)
            window.app.observedModel["category_display_" + this.post.cid] = ko.observable(userInputCategory);

            // update db
            socket.emit('posts:update', {
                "id": this.post.attributes._id,
                "targetAttribute": "category",
                "targetValue": userInputCategory,
                "type": "category"
            },
            function(err, data) {
                // console.log(data);
                });
        }

    },
    changeCondition: function() {

        var userInputCondition = $('.conditionInput').val();

        if (userInputCondition) {

            // update model(server sync)
            this.post.attributes.condition = userInputCondition;

            // update model(view sync)
            window.app.observedModel["condition_display_" + this.post.cid] = ko.observable(userInputCondition);

            // update db
            socket.emit('posts:update', {
                "id": this.post.attributes._id,
                "targetAttribute": "condition",
                "targetValue": userInputCondition,
                "type": "condition"
            },
            function(err, data) {
                // console.log(data);
                });
        }

    },
    editPost: function(e) {

        // hide display
        $($(e.currentTarget).children()).hide();

        // load short update form
        var shortUpdateForm = _.template($("#shortUpdateFormTemplate").html(), {});
        $(e.currentTarget).append(shortUpdateForm);
        $("input.span2.captionInput").attr("id", "caption_" + this.post.cid);
        $("input.span2.captionInput").val(this.attributes.caption);
        $("input.priceInput").attr("id", "price_" + this.post.cid);
        $("input.priceInput").val(this.attributes.price);
        var categoryEl = $("select.span1.categoryInput.chzn-select.chzn-done");
        $(categoryEl).attr("id", "category_" + this.post.cid);

        _.each(window.app.initialCategoriesForSale,
        function(category) {
            $(categoryEl).append("<option value=\"" + category + "\"> " + category + " </option>");
        });

        // selected with default
        $(categoryEl).val(this.attributes.category);

    },
    showMoreEdit: function(e) {

        // Hide the More button
        var aMore = $("a.editMore");
        $(aMore).css("visibility", "hidden");

        // Hide the short form
        $("div.shortForm").remove();

        // Append the long form
        var targetParent = $(e.currentTarget).closest("div.carousel-caption");
        var longUpdateForm = _.template($("#longUpdateFormTemplate").html(), {});
        var div = document.createElement("div");
        $(div).addClass("longForm");
        $(div).append(longUpdateForm);
        $(targetParent).append(div);

        // caption
        $("input.span2.captionInput").val(this.attributes.caption);

        // price
        $("input.priceInput").val(this.attributes.price);

        // category
        var categoryEl = $("select.span1.categoryInput.chzn-select.chzn-done");
        $(categoryEl).attr("id", "category_" + this.post.cid);
        _.each(window.app.initialCategoriesForSale,
        function(category) {
            $(categoryEl).append("<option value=\"" + category + "\"> " + category + " </option>");
        });
        $(categoryEl).val(this.attributes.category);

        // condition
        var conditionEl = $("select.span1.conditionInput.chzn-select.chzn-done");
        $(conditionEl).val(this.attributes.condition);
        $(conditionEl).attr("id", "condition_" + this.post.cid)

        // description
        var descEl = $("textarea.text-area-custom.descInput");
        $(descEl).attr("id", "description_" + this.post.cid);
        $(descEl).val(this.attributes.description);

    },
    uneditPost: function(e) {

        var parentDiv = e.currentTarget;

        // Get input and Re-display post
        $(parentDiv).children().each(
        function() {
            var child = $(this);
            if (child.is("div.longForm") || child.is("div.row.editHeader") || child.is("div.shortForm")) {
                child.remove();
            }
            else {
                child.show();
            }
        }
        );

        // update
        ko.applyBindings(ko.mapping.fromJS(window.app.observedModel));
        $(e.currentTarget).closest("#editMore").remove();

    },
    deletePostByMe: function(e) {
        // delete in this model (to be implemented)
        // delete in server
        socket.emit("posts:delete", {
            "id": this.post.attributes._id,
        },
        function(err, data) {
            // do something here(maybe)
            });
    },
    showDeleteAlert: function(e) {
        var deleteBox = _.template($("#delteConfirmationTemplate").html(), {});
        var carouselCaption = $(this.el).find(".carousel-caption")[0];
        $(carouselCaption).hide();
        var parentOfCarouselCaption = $(this.el).find(".active");
        parentOfCarouselCaption.append(deleteBox);

    },
    cancelDelete: function(e) {
        var deleteBox = $(this.el).find(".alert-custom")[0];
        $(deleteBox).remove();
        var carouselCaption = $(this.el).find(".carousel-caption")[0];
        $(carouselCaption).show();
    }
});

// PixiphiPingBoxView
Pixiphi.PingBox = Backbone.View.extend({
    events: {
        'keydown': 'closeOnEsc'
    },
    initialize: function(pings) {
        _.bindAll(this, 'render', 'addPingToThread', 'removePingFromThread');
        // _.bindAll(this, 'render');
        this.pings = pings;
        this.threads = {};
        
        // called upon fetch
        this.pings.bind('reset', this.render);

        // called when collection adds a new ping from server
        this.pings.bind('add', this.addPingToThread);

        // called when a collection is told to remove a ping
        this.pings.bind('remove', this.removePingFromThread);

        // this.render();
    },
    render: function() {

        var self = this;
        self.$el.empty();
        this.el = $("#pingUl");

        // convert to threads
        var listOfPingItems = this.threadifyPings(this.pings);
        // add threads. one thread has many pings
        _.each(listOfPingItems,
        function(thread) {
            self.addThread(thread);
        })

        return this;
    },
    threadifyPings: function(pings) {

        var self = this;

        // get a unique list of all usernames
        var toUser = _.pluck(_.pluck(_.pluck(pings.models, "attributes"), "toUser"), "id");
        var fromUser = _.pluck(_.pluck(_.pluck(pings.models, "attributes"), "fromUser"), "id");
        var allUser = _.union(toUser, fromUser);
        var thisUserId = $('#userId').html();
        allUser.splice(allUser.indexOf(thisUserId), 1);

        // split pings into threads based on { user , targetUser }
        var pings = pings;
        var listOfPingItems = [];
        _.each(allUser,
        function(userId) {

            var thisPingItems1 = _.filter(pings.models,
            function(ping) {
                return ping.attributes.toUser.id == userId && ping.attributes.fromUser.id == thisUserId;
            });

            var thisPingItems2 = _.filter(pings.models,
            function(ping) {
                return ping.attributes.toUser.id == thisUserId && ping.attributes.fromUser.id == userId;
            });

            var thisPingItems = _.union(thisPingItems1, thisPingItems2);

            // get user object
            var targetPing = _.find(pings.models,
            function(ping) {
                return ping.attributes.toUser.id == userId;
            });

            if (typeof(targetPing) == 'undefined') {
                var targetUser = _.find(pings.models,
                function(ping) {
                    return ping.attributes.fromUser.id == userId;
                }).attributes.fromUser;
            }
            else {
                var targetUser = targetPing.attributes.toUser;
            }

            listOfPingItems.push({
                "targetUser": targetUser,
                "targetPostId": _.first(thisPingItems).attributes.postId,
                "pingItems": thisPingItems
            });

        });

        return listOfPingItems;

    },
    addThread: function(thread) {
        // prepare a ping thread
        var tel = new Pixiphi.PingThread(thread);
        this.threads[thread.targetUser.id] = tel;
        $(this.el).append(tel.el);
    },
    initializeNewThread: function(ping) {
        // unknown model added,remove
        if (typeof(this.pings.models[0].attributes.true) == 'object') {
            this.pings.models.shift();
        }

        // create the new thread
        this.render();
    },
    removeThread: function(thread) {
        // $($("#" + ping.cid)[0]).remove();
        console.log("implement this later");
    },
    addPingToThread: function(ping) {

        // determine which user and add to that thread, use targetUser as Id
        if (ping.attributes.fromUser.id == $('#userId').html()) {
            var threadId = ping.attributes.toUser.id;
        }
        else {
            var threadId = ping.attributes.fromUser.id;
        }

        // add to new or existing thread
        if (this.threads[threadId] == undefined) {
            this.initializeNewThread(ping);

            // notify if this is the receiving user
            if (_.indexOf(_.keys(window.app.pingQueue), ping.attributes.fromUser.id) == -1 &&
            $('#userId').html() == ping.attributes.toUser.id &&
            !$("#pingBox").is(":visible")) {
                window.app.pingQueue[ping.attributes.fromUser.id] = 1
                $("div.noti_bubble").html(_.keys(window.app.pingQueue).length).show();
                // show internal ping notification
                this.threads[threadId].pingQueue.add(ping);
            }
        }
        else {
            this.threads[threadId].thread.add(ping);
        }

    },
    removePingFromThread: function(ping) {
        // to be implemented
        console.log("to be implemented");
    },
    closeOnEsc: function(e) {
        console.log(e);
    }
});

Pixiphi.PingThread = Backbone.View.extend({
    tagName: 'li',
    events: {
        'click .openPingDialog': 'openPingDialog'
    },
    initialize: function(thread) {
        _.bindAll(this, 'render', 'addPing', 'removePing', 'updatePingQueueNotification');

        var self = this;
        // _.bindAll(this, 'render');
        // this.thread = thread.pingItems; // pings are saved here
        this.thread = new Pixiphi.Pings(false);
        this.pingQueue = new Backbone.Collection();
        this.pingQueue.on('add', this.updatePingQueueNotification)
        this.thread.comparator = function(ping) {
            return + ping.get("timestamp");
        };
        _.each(thread.pingItems,
        function(ping) {
            self.thread.add(ping);
        });
        this.targetUser = thread.targetUser;
        // this thread's target user
        this.targetPostId = thread.targetPostId;

        // called when collection adds a new ping from server
        this.thread.bind('add', this.addPing);

        // called when a collection is told to remove a ping
        this.thread.bind('remove', this.removePing);

        // $($(this.el)[0]).attr("id", thread.targetUser); // use target user as Id
        // this.id = thread.targetUser;
        // window.app.pingsThreads = ;
        this.render();

    },
    render: function() {
        
        // Get user profile pic
        var targetUserId = this.targetUser.id;
        var userProfileUrl = "https://api.twitter.com/1/users/show.json?user_id=" + targetUserId + "&include_entities=true";

        // keep a record
        if (_.has(window.app.pingUserInfo, targetUserId)) {
            var userProfilePic = $("img.userProfilePic");
            $(userProfilePic).attr("src", window.app.pingUserInfo[targetUserId].src);
        }
        else {
            $.ajax({
                url: userProfileUrl,
                dataType: "jsonp",
                success: function(data) {
                    var userProfilePic = $("img.userProfilePic");
                    $(userProfilePic).attr("src", data.profile_image_url);

                    // keep a record
                    if (!_.has(window.app.pingUserInfo, targetUserId)) {
                        window.app.pingUserInfo[targetUserId] = new Image();
                        window.app.pingUserInfo[targetUserId].src = data.profile_image_url;
                    }
                }
            })
        }
        
        if (this.thread.models.length > 0) {
            var latestMessage = _.last(this.thread.models).attributes.message;

            var pingThread = _.template($("#pingThreadTemplate").html(), {
                "message": latestMessage,
                "fromUser": this.targetUser.name
            });
            $(this.el).html(pingThread);
        }

        // TEMP
        // ------------------------------------------------------------
        // var userProfilePic = $("img.userProfilePic");
        //         $(userProfilePic).attr("src", "/images/wood.gif");
        //
        //         // keep a record
        //         if (!_.has(window.app.pingUserInfo, targetUserId)) {
        //             window.app.pingUserInfo[targetUserId] = new Image();
        //             window.app.pingUserInfo[targetUserId].src = "/images/wood.gif";
        //         }

        // ------------------------------------------------------------
        // $(userProfilePic).attr("src", data);

        // remove attr in div
        var attLen = this.el.attributes.length;
        while (attLen--) {
            var attr = this.el.attributes[attLen];
            if (attr.nodeName != "class") {
                this.el.attributes.removeNamedItem(attr.nodeName);
            }
        }

        return this;
    },
    addPing: function(ping) {

        // add ping to view
        var pingUl = $("ul.pingWindow");
        var pingLi = new Pixiphi.PingItem(ping);
        $(pingUl).append(pingLi.el);

        //scroll to bottom
        $("div.modal-body.pingContainer").scrollTop($("div.well.pingBox").prop("scrollHeight"));

        // add to latest preview and make it bold
        $("p.msgPreview").html(ping.attributes.message);
        if ($("div.pingWindow").length == 0) {
            $("p.msgPreview").addClass("boldPreview");
        }

        // only show notification if ping window is hidden and this ping belongs to this user
        if (ping.attributes.toUser.id == $('#userId').html() && !$("div.pingWindow").is(":visible")) {
            // update main notification
            if (_.indexOf(_.keys(window.app.pingQueue), ping.attributes.fromUser.id) == -1 && !$("#pingBox").is(":visible")) {
                window.app.pingQueue[ping.attributes.fromUser.id] = 1
                $("div.noti_bubble").html(_.keys(window.app.pingQueue).length).show();
            }
            else {
                window.app.pingQueue[ping.attributes.fromUser.id] += 1;
            }

            // update internal ping count notification
            this.pingQueue.add(ping);
        }
    },
    removePing: function(ping) {
        // remove ping to view (to be implemented)
        console.log("to be implemented");
    },
    updatePingQueueNotification: function() {
        // show internal ping count notification
        $("div.internalPingCountContainer").show();
        $("h5.internalPingCount").html(this.pingQueue.length);
    },
    openPingDialog: function(e) {
        // show pings
        // construct Pixiphi.PingItems here
        var pingThread = $(this.el).parent();

        var pingDiv = document.createElement("div");
        $(pingDiv).addClass("pingWindow");

        // remove bold
        $("p.msgPreview").removeClass("boldPreview");

        // remove notification
        $("div.internalPingCountContainer").hide();
        $("h5.internalPingCount").html("");
        this.pingQueue.reset();
        // this.pingQueue.length = 0;
        // body of pings
        var pingDivBody = document.createElement("div");
        $(pingDivBody).addClass("pingbody");
        var pingUl = document.createElement("ul");
        $(pingUl).addClass("pingWindow");
        $(pingUl).addClass("nav");
        _.each(this.thread.models,
        function(ping) {
            var pingLi = new Pixiphi.PingItem(ping);
            $(pingUl).append(pingLi.el);
        });
        $(pingDivBody).append(pingUl)
        $(pingDiv).append(pingDivBody);

        // type message at footer
        var pingDivFooter = document.createElement("div");
        $(pingDivFooter).addClass("pingFooter");
        var pingFooter = new Pixiphi.Pinger(this.targetUser, this.targetPostId);
        $(pingDivFooter).append(pingFooter.el);
        $($("div.modal-footer.pingBox")[0]).append(pingDivFooter);

        // add to parent
        $(pingThread).after(pingDiv);

        // hide list of ping threads
        $(pingThread).hide();

        // add caret to header
        $("h5.pingCaret").show();
        // add user to header
        $("h4.pingUser").html(this.targetUser.name);
        $("h4.pingUser").show();

        // scroll to bottom of pings
        // var height = this.thread.length * 100;
        // $("div.modal-body.pingContainer").scrollTop($("div.well.pingBox").prop("scrollHeight"));
        $("div.modal-body.pingContainer").scrollTop(20999);
        // $("div.well.pingBox").scrollTop(20499);
        // focus on textarea
        $("input.span5.ping").focus();

        // glowing effect to new messages
    }
});

Pixiphi.PingItem = Backbone.View.extend({
    tagName: 'li',
    initialize: function(ping) {
        this.ping = ping;
        this.render();
        $($(this.el)[0]).attr("id", ping.cid);
    },
    render: function() {

        var divPing = document.createElement("div");
        $(divPing).addClass("bubble");

        // add appropriate class
        if (this.ping.attributes.fromUser.id == $('#userId').html()) {
            $(divPing).addClass("left");
            // msg
            var innerBubble = _.template($("#pingInnerBubbleLeftTemplate").html(), {
                "msg": this.ping.attributes.message
            });
            $(divPing).append(innerBubble);
            $(this.el).append(divPing);

            // user pic
            var imgSrc = window.app.pingUserInfo[this.ping.attributes.toUser.id].src

            var imgPic = document.createElement("img");
            $(imgPic).attr("src", "http://a0.twimg.com/profile_images/1663087930/image_normal.jpg");
            // $(imgPic).attr("src", "http://a0.twimg.com/profile_images/1663087930/image_normal.jpg");
            $(this.el).find("div.span1.profPicBoxLeft").append(imgPic);
            $(this.el).find("img").addClass("profPicSmall");

        }
        else {
            $(divPing).addClass("right");
            // msg
            var innerBubble = _.template($("#pingInnerBubbleRightTemplate").html(), {
                "msg": this.ping.attributes.message
            });
            $(divPing).append(innerBubble);
            $(this.el).append(divPing);

            // user pic
            var imgSrc = window.app.pingUserInfo[this.ping.attributes.fromUser.id].src

            var imgPic = document.createElement("img");
            $(imgPic).attr("src", imgSrc);
            // $(imgPic).attr("src", "http://a0.twimg.com/profile_images/1663087930/image_normal.jpg");
            $(this.el).find("div.span1.profPicBoxRight").append(imgPic);
            $(this.el).find("img").addClass("profPicSmall");

        }

        // remove attr in div
        var attLen = this.el.attributes.length;
        while (attLen--) {
            var attr = this.el.attributes[attLen];
            if (attr.nodeName != "class") {
                this.el.attributes.removeNamedItem(attr.nodeName);
            }
        }
        return this;
    }
});

Pixiphi.Pinger = Backbone.View.extend({
    events: {
        'keydown input.span5.ping': 'sendOnEnter',
        'click button.btn.btn-primary.ping': 'sendPing',
        'keypress input.span5.ping': 'limitPingMessageLength'
    },
    initialize: function(user, postId) {
        this.targetUser = user;
        this.targetPostId = postId;
        this.render();
    },
    render: function() {

        var pingFooter = _.template($("#pingDivFooter").html(), {});
        $(this.el).html(pingFooter);
        return this;

    },
    sendOnEnter: function(e) {
        if (e.keyCode == 13) {
            this.sendPing();
        }
    },
    sendPing: function() {

        if ($("input.span5.ping").val().length == 0) return;

        var Ping = Pixiphi.Ping.extend({
            noIoBind: true
        });

        // get relevant info
        var fromUser = {
            "name": $('#userName').html(),
            "id": $('#userId').html()
        }
        var toUser = {
            "name": this.targetUser.name,
            "id": this.targetUser.id,
        }

        var postId = this.targetPostId;

        var attr = {
            fromUser: fromUser,
            toUser: toUser,
            message: $("input.span5.ping").val(),
            postId: postId,
            timestamp: +new Date()
        }

        var _ping = new Ping(attr);
        socket.emit('ping:create', _ping);
        // clear input
        $("input.span5.ping").val("");

        // $("div.modal-body.pingContainer").scrollTop($("div.well.pingBox").prop("scrollHeight"));
        $("div.pingWindow").scrollTop(1000000000);

    },
    limitPingMessageLength: function(evt) {
        var currentCount = $("input.span5.ping").val().length;
        var charCode = (evt.which) ? evt.which: event.keyCode;
        if (currentCount > 140) {
            return false;
        }
        return true;
    },

})

// ------------------------------------------------------------------------------------------
// Presenter
// ------------------------------------------------------------------------------------------
 Pixiphi.Page = Backbone.View.extend({
    el: $("body"),
    events: {
        'click #addPost': 'addPostToServer',
        'change #postModal input': 'getInput',
        'change .selectCategoryInAddNewPost': 'getSelect',
        'click #postInit': 'postInit',
        'click #closePost': 'cancelAddNewPost',
        // 'click #postsByMe': 'showPostsByMe',
        'click #userCity': 'showCityPosts',
        'click #loadMoreButton': 'loadMorePost',
        'click .categoryPill': 'changeCategory',
        'keydown': 'manageKeydown',
        // 'click #postDetails': 'showPostDetails',
        'click .close-reveal-modal': 'manageScrolls',
        'click .navbar-inner': 'hideModals',
        'click #itemLocationCheckBox': 'manageItemLocationField',
        'keydown #itemLocation': 'validateAddress',
        'click .nailthumbs-enable': 'addPicture',
        'click #closePingBox': 'closePingBox',
        'click #mainPing': 'showMainPing',
        'mouseover li.glowable': 'glow',
        'mouseleave li.glowable': 'unglow',
        'keypress input.span2.selling-for-input': 'numbersOnly',
        'keypress input.input-xlarge.selling-what-input': 'limitCaptionLength',
        'click .conditionOption': 'afterSelectCondition',
        'focus input.span2.selling-for-input': 'afterPriceFocus',
        'keydown textarea.input-xlarge.text-area-custom': 'limitDescLength',
        'click #cancelAddNewPostYes': 'cancelAddNewPostYes',
        'click #cancelAddNewPostNo': 'cancelAddNewPostNo',
        'keydown input.priceInput': 'numbersOnly',
        'keypress input.span2.captionInput': 'limitCaptionLength',
        'keydown textarea.text-area-custom.descInput': 'limitDescLength',
        'click #initPing': 'showPings',
        'keydown input.span5.pingItemPinger': 'sendPingOnEnter',
        'click a.btn.btn-primary.pingItemPinger': 'sendPing'
        // 'keydown input.input-xlarge.selling-what-input': 'detectOtherChars'
        // 'click #toggleItemModalBtn': 'toggleItemDetailModal'
        // 'click #forSaleAll' : 'activateForSale'
        // 'keydown' : 'triggerSearchBar'
    },
    sendPingOnEnter: function(e) {
        if (e.keyCode == 13) {
            this.sendPing();
        }
    },
    sendPing: function() {
        if ($("input.span5.pingItemPinger").val() == "") return;
        
        window.app.tempPing.attributes.message = $("input.span5.pingItemPinger").val();
        window.app.tempPing.attributes.timestamp = +new Date();

        // clear input
        $("input.span5.pingItemPinger").val("");

        socket.emit('ping:create', window.app.tempPing);
        
        window.app.tempPing = null;
        
        $("#pingItemBox").modal("hide");
        $("#pingItemBox").remove();
    },
    cancelAddNewPostYes: function() {
        $("#cancelAddNewPostPromptModal").modal("hide");
        $("#postModal").css("z-index", 1050);
        $("#postModal").modal("hide");
        $("body").removeClass("disableScrolling");
        this.clearForm();
    },
    cancelAddNewPostNo: function() {
        $("#cancelAddNewPostPromptModal").modal("hide");
        $("#postModal").css("z-index", 1050);
    },
    limitDescLength: function(evt) {
        var currentCount = $("textarea.input-xlarge.text-area-custom").val().length;
        var charCode = (evt.which) ? evt.which: event.keyCode;
        if (charCode == 8) return true;
        if (currentCount > 400) {
            return false;
        }
        return true;
    },
    afterPriceFocus: function() {
        $("span.add-on.selling-for-span").removeClass("glowError");
        $("input.span2.selling-for-input").removeClass("glowError");
    },
    afterSelectCondition: function() {
        $(".conditionOption").removeClass("glowError");
    },
    detectOtherChars: function(evt) {
        if ($("p.charCount.pull-right").html() == 20) return true;
        var currentCount = $("input.input-xlarge.selling-what-input").val().length;
        $("p.charCount.pull-right").html(20 - currentCount + 1);
        return true;
    },
    limitCaptionLength: function(evt) {
        $("input.input-xlarge.selling-what-input").removeClass("glowError");
        var currentCount = $("input.input-xlarge.selling-what-input").val().length;
        // if ($("p.charCount.pull-right").html() === 0) return false;
        var charCode = (evt.which) ? evt.which: event.keyCode;
        // if (charCode > 31 && (charCode < 48 || charCode > 57)){
        if (currentCount > 15) {
            return false;

        }
        // $("p.charCount.pull-right").html(20 - currentCount - 1);
        return true;
    },
    numbersOnly: function(evt) {
        var charCode = (evt.which) ? evt.which: event.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            return false;

        }
        return true;
    },
    unglow: function(e) {
        $($(e.currentTarget).find("div.glowable-div")).removeClass("glow");
    },
    glow: function(e) {
        $($(e.currentTarget).find("div.glowable-div")).addClass("glow");
    },
    initialize: function() {
        _.bindAll(this, 'addPostToServer');
        this.cityDropDownPopulated = false;
    },
    render: function() {
        return this;
    },
	initProgressStatus: function() {
		
		var startAnimate = function() {
	       $('#bar1').animate({
            opacity: 1,
            height: "50px",
            top: "-=12",
            left: "-=2",
            width: "16px"
            }, 200, function() {
            $('#bar1').animate({
                opacity: 0.2,
                height: "25px",
                top: "+=12",
                width: "10px",
                left: "+=2"
                }, 200, function() {

            });
        });

        bar2Timer = setTimeout(function() {
            $('#bar2').animate({
                opacity: 0.5,
                height: "42px",
                top: "-=8",
                width: "13px",
                left: "-=1"
                }, 200, function() {
                $('#bar2').animate({
                    opacity: 0.2,
                    height: "25px",
                    top: "+=8",
                    width: "12px",
                    left: "+=1"
                    }, 200, function() {

                });
            })
        }, 200);

        bar3Timer = setTimeout(function() {
            $('#bar3').animate({
                opacity: 1,
                height: "50px",
                top: "-=12",
                left: "-=2",
                width: "16px"
                }, 200, function() {
                $('#bar3').animate({
                    opacity: 0.2,
                    height: "25px",
                    top: "+=12",
                    width: "10px",
                    left: "+=2"
                    }, 200, function() {

                });
                }
            )
        }, 400);
	    }

		// start
		window.animated = setInterval(startAnimate, 700);
	},
    postInit: function() {
        this.post = {};
        this.post.src = [];
        this.post.oriDimSrc = [];

        $("body").addClass("disableScrolling");

        // remove error class
        $($(".nailthumb-clicked")).removeClass("nailthumb-clicked");
        $("li.post-item-preview").removeClass("glowError");
        $("#itemLocation").removeClass("glowError");
        $(".conditionOption").removeClass("glowError");
        $(".selectCategoryInAddNewPost").removeClass("selectGlowError");
        $("input.input-xlarge.selling-what-input").removeClass("glowError");
        $("span.add-on.selling-for-span").removeClass("glowError");
        $("input.span2.selling-for-input").removeClass("glowError");
        $("div.alert.alert-error.alert-post-new").remove();

        //update caption on user change input
        $("input.input-xlarge.selling-what-input").keyup(function(e) {
            $("h4.caption-tag").html($(this).val());
        });

        //update category on user change input
        $("select.selectCategoryInAddNewPost").change(function(e) {
            $("h4.category-tag").html($(this).val());
        })

        //update price on user change input
        $("input.span2.selling-for-input").keyup(function(e) {
            $("h4.price-tag").html("$" + $(this).val());
        })

        // use current location on default
        if (!$("#itemLocationCheckBox").prop("checked")) {
            $("#itemLocationCheckBox").trigger("click");
            this.manageItemLocationField();
        }
        else {
            $("#itemLocationCheckBox").trigger("click");
            $("#itemLocationCheckBox").trigger("click");
            this.manageItemLocationField();
        }

        // reset form
        this.clearForm();

        // open up modal
        $("#postModal").modal({
            backdrop: "static",
            keyboard: false
        })

        // handles image uploads
        var self = this;
        $("input.file-input").change(function(e) {
			
			var thisInput = this;
			
            // get file name
            console.log(this.files[0])
            var fileType = this.files[0].name.split(".")[1].toLowerCase();

            // if invalid file type, warning
            if (!_.include(window.app.allowedExtensions, fileType)) {

                // remove file
                $(this).val("")

                // give warning
                self.showAlert("Oops...", "Unfortunately we only allow JPEG, JPG or PNG images. Try again?");

                return;
            }


            // remove plus class
            $($(e.currentTarget).parent()).removeClass("nailthumbs-enable");

            var nextUpload = $($(e.currentTarget).parent().next());

            var files = this.files;

            var preview = $(this).parent();
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var imageType = /image.*/;

                if (!file.type.match(imageType)) {
                    continue;
                }

                $(preview).find("input").hide();

                var reader = new FileReader();
                reader.onload = (function(preview, nextUpload) {
                    return function(e) {

                        // emit to server, save
                        var prevEl = preview;
                        var nextUploadEl = nextUpload;
						
						// Initiate progress bar
						// self.initProgressStatus("start");
						
						// show progress bar
						
						// attach loading bar
						var thisInputParent = $(thisInput).parent();
						$(thisInputParent).empty();
						var loadingStatusBar = _.template($("#loadStatusBar").html(), {});
						$(thisInputParent).append(loadingStatusBar);
						self.initProgressStatus();
						
                        socket.emit('thumbnail-preview', {
                            "img-src": e.target.result
                        },
                        function(err, data) {
							
							// images uploaded successfully on server
							
							// hide progress bar
							// self.initProgressStatus("stop");
							clearInterval(window.animated)
							$($(thisInputParent).find("div.row")[0]).remove();
							
                            // get url
                            var thumbnailUrl = data[1].replace("./public", "");
                            $(prevEl).attr("style", "background: url(" + thumbnailUrl + ") no-repeat");
                            $(nextUploadEl).addClass("nailthumbs-enable");
                            $(nextUploadEl).find("input").removeClass("hide");

                            // preview in profile if does not exist
                            var profilePicEl = $($(prevEl).parent()).prev();

                            // listener to make clicked thumbnail profile pic
                            $(prevEl).click(function(e) {

                                // remove other indicators
                                _.each($(prevEl).siblings(),
                                function(sibling) {
                                    $(sibling).removeClass("nailthumb-profile");
                                });

                                // make this profile
                                $(prevEl).addClass("nailthumb-profile");
                                $(profilePicEl).find("img").remove();
                                var profImg = document.createElement("img");
                                var imgSrc = $(prevEl).find("p").html()
                                $(profImg).attr("src", imgSrc.replace("./public", ""));
                                profImg.style.height = "370px";
                                profImg.style.width = "360px";
                                $($(profilePicEl).find(".carousel-caption")).before(profImg);

                            });

                            // console.log("callback");
                            // add profile pic
                            if ($(profilePicEl).find("img").length == 0) {
                                var profImg = document.createElement("img");
                                $(profImg).attr("src", data[0].replace("./public", ""));
                                profImg.style.height = "370px";
                                profImg.style.width = "360px";

                                $($(profilePicEl).find(".carousel-caption")).before(profImg);

                                // make hidden backup
                                var profHidden = document.createElement("p");
                                $(profHidden).attr("hidden", "hidden");
                                // $(profHidden).html(e.target.result);
                                $(profHidden).html(data[0]);
                                $(prevEl).append(profHidden);
                                self.post.src.push(data[0]);
                                self.post.oriDimSrc.push(data[2]);
                                // show that this is a profile pic
                                $(prevEl).addClass("nailthumb-profile");

                            }
                            else {
                                // make hidden backup
                                var profHidden = document.createElement("p");
                                $(profHidden).attr("hidden", "hidden");
                                // $(profHidden).html(e.target.result)
                                $(profHidden).html(data[0]);
                                self.post.src.push(data[0]);
                                self.post.oriDimSrc.push(data[2]);
                                $(prevEl).append(profHidden);
                            }

                        });

                    };
                })(preview, nextUpload);
                reader.readAsDataURL(file);
            }
        })

    },
    getSelect: function(e) {
        $(".selectCategoryInAddNewPost").removeClass("selectGlowError");
        var field = $(e.currentTarget);
        var value = $("option:selected", field).val();
        this.post[field.attr('id')] = value;
    },
    getInput: function(e) {
        var field = $(e.currentTarget);
        this.post[field.attr('id')] = field.val();
    },
    cancelAddNewPost: function() {

        // get profile pic
        var profPicUrl = $($(".nailthumb-profile").find("p")[0]).html();
        // console.log(profPicUrl);
        // get condition
        var conditionSelected = ""
        _.each($("#condition").children(),
        function(child) {

            if ($(child).hasClass("active")) {
                conditionSelected = $(child).html();
            }
        });

        // console.log(this.post.oriDimSrc);
        // get data here from client
        var attr = {
            caption: this.post.caption,
            description: $("#description").val(),
            category: this.post.category,
            price: this.post.price,
            condition: conditionSelected,
            profPicUrl: profPicUrl,
        };

        if (typeof(attr.caption) != 'undefined' ||
        typeof(attr.category) != 'undefined' ||
        attr.condition.length != 0 ||
        typeof(attr.price) != 'undefined' ||
        attr.description.length != 0 ||
        attr.profPicUrl != null) {

            // show alert box
            $("#cancelAddNewPostPromptModal").modal({
                backdrop: "static",
                keyboard: false
            });

            // backdrop
            $("#postModal").css("z-index", 0);
        }
        else {
            this.cancelAddNewPostYes();
        }

    },
    clearForm: function() {
        _.each($("#condition").children(),
        function(child) {
            $(child).removeClass("active");
        });
        $("#description").val("");
        $("div.row.nailthumbsHolder").empty().append(_.template($("#postModalNailthumbTemplate").html(), {}));
        $($("div.active.item.profilePicContainer").find("img")[0]).remove();
        $('#caption').val("");
        $('#category').val("");
        $('#price').val("");
        $('#condition').val("");
    },
    addPostToServer: function() {
        var Post = Pixiphi.Post.extend({
            noIoBind: true
        });
        this.post.postedTime = Date.now();

        var itemLocation;
        var lat;
        var lng;
        if (typeof(this.post.itemLocation) == 'undefined') {
            itemLocation = $("span.input-xlarge.uneditable-input").html();
            lat = window.app.latlng.lat();
            lng = window.app.latlng.lng();
        }
        else {
            itemLocation = this.post.itemLocation;
            lat = "";
            lng = "";
        }

        // get profile pic
        var profPicUrl = $($(".nailthumb-profile").find("p")[0]).html();
        // console.log(profPicUrl);
        // get condition
        var conditionSelected = ""
        _.each($("#condition").children(),
        function(child) {

            if ($(child).hasClass("active")) {
                conditionSelected = $(child).html();
            }
        });

        // console.log(this.post.oriDimSrc);
        // get data here from client
        var attrs = {
            caption: this.post.caption,
            description: $("#description").val(),
            category: this.post.category,
            price: this.post.price,
            uploadDate: +new Date(),
            condition: conditionSelected,
            location: window.app.userCity,
            address: itemLocation,
            lat: lat,
            lng: lng,
            imgSrc: this.post.src,
            oriDimSrc: this.post.oriDimSrc,
            profPicUrl: profPicUrl,
            authorName: $('#userName').html(),
            authorId: $('#userId').html()
        };



        // validate
        if (this.validated(attrs)) {
            var _post = new Post(attrs);
            socket.emit("post:create", _post);
            this.clearForm();
            $("body").removeClass("disableScrolling");
            $('#postModal').modal('hide');
        }
        else {
            var alertHeader = "Oops you missed a few fields . . .";
            var alertBody = "Go ahead and fix them then try again =D";

            this.showAlert(alertHeader, alertBody);
        }

    },
    showAlert: function(header, body) {
        $("div.alert.alert-error.alert-post-new").remove();

        // show error
        var alert = document.createElement("div");
        $(alert).addClass("alert");
        $(alert).addClass("alert-error");
        $(alert).addClass("alert-post-new");
        $(alert).append("<a class=\"close\" data-dismiss=\"alert\">x</a> ");
        $(alert).append("<h4 class=\"alert-heading\">" + header + "</h4>");
        $(alert).append(body)

        $("div.modal-header h5").before(alert);

    },
    validated: function(attr) {
        var captionE = false;
        var cateE = false;
        var condE = false;
        var priceE = false;
        var profE = false;
        var locE = false;
        if (typeof(attr.caption) == 'undefined') {
            $("input.input-xlarge.selling-what-input").addClass("glowError");
            captionE = true;
        }
        if (typeof(attr.category) == 'undefined') {
            $("select.selectCategoryInAddNewPost").addClass("selectGlowError");
            cateE = true;
        }
        if (attr.condition.length === 0) {
            $(".conditionOption").addClass("glowError");
            condE = true;
        }
        if (typeof(attr.price) == 'undefined') {
            $("span.add-on.selling-for-span").addClass("glowError");
            $("input.span2.selling-for-input").addClass("glowError");
            priceE = true;
        }
        if (attr.profPicUrl == null) {
            $("li.post-item-preview").addClass("glowError");
            // $("div.span1.nailthumbs.nailthumbs-enable").addClass("glowError");
            profE = true;
        }

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            address: $("#itemLocation").val()
        },
        function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                // console.log("Valid address");
                var validLoc;
                for (result in results) {
                    for (address in results[result].address_components) {
                        if (results[result].address_components[address].long_name.toLowerCase() == window.app.userCity.toLowerCase()) {
                            validLoc = true;
                            break;
                        }
                    }
                }
                if (!validLoc) {
                    locE = true;
                    $("#itemLocation").addClass("glowError");
                }
            } else {
                // console.log("Invalid address");
                }
        })


        if (captionE && cateE && condE && priceE && profE) {
            return false;
        }

        return true;
    },
    showPostsByMe: function() {

        // remove existing
        // if ($('#PostsGridWrapper').find("#PostByMeGrid").length == 1) {
        $("#PostByMeGrid").remove();
        // }
        window.app.navigate("//" + window.app.userCity + "/yourposts", {
            trigger: false
        });
        // window.location = "/#/yourposts"
        // track current page
        window.app.page.currentPage = "showPostsByMe"

        // Get all posts from current logged in user
        var postsByMe = _.filter(window.app.postsGrid.posts.models,
        function(model) {
            return model.attributes.author.name == $('#userName').html()
        })

        // If the user posted something, show all posts by him/her
        if (typeof(postsByMe) != 'undefined') {
            // create a new view instance and pass the filtered collection
            this.hideAllGrids();
            $('#welcomeHero').hide();
            
            //post hero unit
            var postsByMeHero = _.template($('#postsByMeHeroTemplate').html(), {})
            $("#postsByMeHero").remove();
            $('#loadMoreButtonGroup').after(postsByMeHero);

            // declare new collection of posts by me
            var postsByMeCollection = new Pixiphi.Posts(postsByMe)

            // attach to app
            window.app.postsByMeGrid = new Pixiphi.PostsGrid(postsByMeCollection, 'PostByMeGrid', true)
            $('#PostsGridWrapper').append(window.app.postsByMeGrid.el);

        }
        else {
            // Show a message saying the user has not posted anything yet
            var noPostByMe = _.template($('#noPostsByMe').html());
            this.hideAllGrids()
            $('#PostsGridWrapper').append(noPostByMe);
        }
    },
    loadMorePost: function() {

        // load more posts from queue
        var numOfNewPosts = window.app.postsGrid.postsQueue.length;
        _.each(window.app.postsGrid.postsQueue,
        function(queuedPost) {
            var exists = window.app.postsGrid.posts.get(queuedPost.id)
            if (!exists) {
                if (window.app.page.currentPage == "showPostsByMe") {
                    window.app.postsByMeGrid.posts.add(queuedPost);
                }
                else if (window.app.page.currentPage == "showPostsByCategory") {
                    window.app.postsByCategoryGrid.posts.add(queuedPost);
                }
                else {
                    window.app.postsGrid.posts.add(queuedPost);
                }
            }
        })
        window.app.postsGrid.postsQueue = [];
        if (window.app.page.currentPage == "showPostsByMe") {
            window.app.postsByMeGrid.render()
        }
        else if (window.app.page.currentPage == "showPostsByCategory") {
            window.app.postsByCategoryGrid.render()
            $("categoryInfo").show();
        }
        else {
            window.app.postsGrid.render()
        }
        $('#loadMoreButtonGroup').hide()

        // add a glowing effect for new items
        var items = $("div.thumbnail");
        for (var i = 0; i < numOfNewPosts; i++) {
            $(items[i]).addClass("newItemGlow");
        }

        var fadeGlow = setTimeout(function() {
            console.log("fade now");
            for (var i = 0; i < numOfNewPosts; i++) {
                $(items[i]).removeClass("newItemGlow");
            }
            clearTimeout(fadeGlow);
        },
        1500);


    },
    changeCategory: function(e) {
        // make this category active
        // $(e.currentTarget).attr("class", "active")
        // deactivate other pills
        // var categoryNavPills = $(e.currentTarget.parentElement).find("li");
        // categoryNavPills.splice(_.indexOf(categoryNavPills, e.currentTarget), 1)
        // _.each(categoryNavPills,
        // function(navPill) {
        //     $(navPill).attr("class", "categoryPill")
        // })
        // reload posts based on category
        var categoryChosen = $(e.currentTarget).find("a")[0].text
        window.app.navigate("#/category>" + category, {
            trigger: true,
            replace: true
        });

        // this.showPostsByCategory(categoryChosen)
        // show category header
        $('#forSaleDropDown').removeClass("active")
        this.removeCategoryInfo()
        var categoryHeader = _.template($('#categoryInfoTemplate').html(), {
            "category": categoryChosen
        })
        // $('#categoryNavPill').after(categoryHeader)
        $('#loadMoreButtonGroup').after(categoryHeader)

    },
    removeCategoryInfo: function(e) {
        $('#categoryInfo').remove()
    },
    activateForSale: function(e) {
        $('#forSaleDropDown').addClass("active")
    },
    manageKeydown: function(e) {

        // if press enter in search box
        if (e.keyCode == 13 && $('#searchBar').is(":focus")) {
            this.showSearchResults($('#searchBar').val())
        }
        else if (e.keyCode == 27 && $("#pingBox").is(":visible")) {
            // if press escape
            this.closePingBox();
        }
    },
    hideAllGrids: function() {
        _.each($('#PostsGridWrapper').children(),
        function(child) {
            $(child).hide();
        })
    },
    showSearchResults: function(query) {

        // if submit empty query, simply return all posts
        if (!query) {
            window.location = "/";
            // this.hideAllGrids()
            // $('#categoryNavPill').show()
            // $('#welcomeHero').show();
            // $('#PostGrid').show()
        }
        else {
            // track current page
            window.app.page.currentPage = "searchResult";

            // delete any existing postsByCategory
            if (typeof(window.app.searchResultGrid) != 'undefined') {
                window.app.searchResultGrid.remove();
            }

            // select posts in chosen category
            var searchResult = _.filter(window.app.postsGrid.posts.models,
            function(model) {
                return model.attributes.caption == query
            })

            // now load posts by chosen category
            if (searchResult.length > 0) {
                // create a new view instance and pass the filtered collection
                // $('#PostsGridWrapper').empty();
                this.hideAllGrids();
                this.removeCategoryInfo()
                $('#welcomeHero').hide();

                // declare new collection of posts by category
                var searchResultCollection = new Pixiphi.Posts(searchResult);

                // attach to app
                window.app.searchResultGrid = new Pixiphi.PostsGrid(searchResultCollection, 'SearchResultGrid', false)
                var searchResultHtml = _.template($('#searchResultTemplate').html(), {})
                $('#PostsGridWrapper').append(searchResultHtml)
                $('#PostsGridWrapper').append(window.app.searchResultGrid.el);
                $("img.home").hover_caption({
                    caption_font_size: '18px',
                    caption_color: 'white',
                    caption_bold: true,
                    caption_default: "Click for screenshots."
                },
                window.app.thisUserSubmittedPost);
            }
            else {
                // tell users nothing found
                var nothingFound = _.template($('#noSearchResultTemplate').html(), {
                    "query": query
                })
                this.hideAllGrids()
                // $('#categoryNavPill').hide()
                $('#PostsGridWrapper').append(nothingFound)

            }
        }
    },
    updateCityDropdown: function(chosenCity) {

        this.currentCity = chosenCity;

        // choose the right city
        _.each(window.app.initialCities,
        function(city) {
            var cityShort = city.toLowerCase().replace(" ", "");
            if (chosenCity == cityShort) {
                window.app.userCityDisplay = city;
            }
        })

        //remove existing
        $("#userCity").remove();

        // update city dropdown
        var brand = $.find(".brand");
        var cityDropDown = _.template($('#cityDropDownTemplate').html(), {
            userCity: window.app.userCityDisplay
        });
        $(brand).after(cityDropDown);

        // filter
        var otherCities = _.without(window.app.initialCities, window.app.userCityDisplay);

        // set url for chosen city
        // $("#userCity").attr("href", "#/"+chosenCity);
        //remove existing
        $("#cityDropDown").remove();

        var otherCitiesDropDown = document.createElement("ul");
        $(otherCitiesDropDown).attr("id", "cityDropDown");
        $(otherCitiesDropDown).addClass("dropdown-menu");

        _.each(otherCities,
        function(otherCity) {
            var url = otherCity.replace(" ", "").toLowerCase();
            var li = document.createElement("li");
            var a = document.createElement("a");
            $(a).attr("href", "#/" + url);
            $(a).css("text-decoration", "none");
            $(a).html(otherCity);
            $(li).append(a);
            $(otherCitiesDropDown).append(li);
        })

        $($.find("#userCity")[0]).after(otherCitiesDropDown)

        this.cityDropDownPopulated = true;

    },
    showCityPosts: function(e) {
        window.app.navigate("#/" + window.app.userCity, {
            trigger: true
        })
    },
    triggerSearchBar: function(e) {

        var allowKeyCodesToTriggerSearch = _.union(_.range(48, 58), _.range(65, 91), _.range(97, 123))
        if (_.indexOf(allowKeyCodesToTriggerSearch, e.keyCode) > 0) {
            $('#searchModal').modal({
                backdrop: false
            })
            $('#searchModal').focus()
        }
    },
    hideModals: function(e) {
        $("#postItemModal").trigger('reveal:close');
        this.manageScrolls({});
    },
    manageScrolls: function(enableScroll) {

        if (typeof(enableScroll) == 'object') {
            enable_scroll();
        }
        else {
            disable_scroll();
        }

        // left: 37, up: 38, right: 39, down: 40,
        // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
        var keys = [37, 38, 39, 40];

        function preventDefault(e) {
            e = e || window.event;
            if (e.preventDefault)
            e.preventDefault();
            e.returnValue = false;
        }

        function keydown(e) {
            for (var i = keys.length; i--;) {
                if (e.keyCode === keys[i]) {
                    preventDefault(e);
                    return;
                }
            }
        }

        function wheel(e) {
            preventDefault(e);
        }

        function disable_scroll() {
            if (window.addEventListener) {
                window.addEventListener('DOMMouseScroll', wheel, false);
            }
            window.onmousewheel = document.onmousewheel = wheel;
            document.onkeydown = keydown;

        }

        function enable_scroll() {
            if (window.removeEventListener) {
                window.removeEventListener('DOMMouseScroll', wheel, false);
            }
            window.onmousewheel = document.onmousewheel = document.onkeydown = null;

        }


    },
    manageItemLocationField: function(e) {
        if ($("#itemLocationCheckBox").prop("checked")) {

            var uneditable = document.createElement("span");
            $(uneditable).addClass("input-xlarge uneditable-input");
            $(uneditable).html(window.app.userAddress);

            $("#itemLocation").parent().append(uneditable)
            $("#itemLocation").hide()
        }
        else {
            $("span.input-xlarge.uneditable-input").remove();
            $("#itemLocation").show();
        }
    },
    validateAddress: function(e) {
        $("#itemLocation").attr("title", "Must be a valid address in " + window.app.userCityDisplay);
        var currentCity = window.app.userCity;
        var inputAddress = $(e.currentTarget).val();
        if (inputAddress.toLowerCase().indexOf(currentCity.toLowerCase()) == -1) {
            $("#itemLocation").tooltip('show');
        }
        else {
            $("#itemLocation").tooltip('hide');
        }
    },
    addPicture: function(e) {
        // remove existing alert
        $("div.alert.alert-error.alert-post-new").remove();

        $("#postModal").mousemove(function() {
            // if user hit cancel upload
            if ($($(".nailthumb-uploaded")).length == 0) {
                $($(".nailthumb-clicked")).removeClass("nailthumb-clicked");
                $("li.post-item-preview").removeClass("glowError");
            }
        });

    },
    showPings: function() {

        $("#pingBox").modal({
            // backdrop: "static",
            // keyboard: false
            });

        // hide notification and reset ping queue
        window.app.pingQueue = {};
        $("div.noti_bubble").hide();

        // make it draggable
        $("#pingBox").draggable();
        // show main ping page
        window.app.page.showMainPing();
        // disable scorlling behind
        $("body").addClass("disableScrolling");

    },
    closePingBox: function(e) {
        $("#pingBox").modal('hide');
        $("body").removeClass("disableScrolling");
        window.app.navigate("//", {
            trigger: false,
            replace: true
        });
    },
    showMainPing: function() {
        $("#pingUl").show();
        $("div.pingWindow").remove();
        $("h5.pingCaret").hide();
        $("h4.pingUser").hide();
        $("div.pingFooter").remove();
        
        // if no pings show message
        // unknown model added,remove
        
        if (window.app.pingBox.pings.models.length == 0) {
            $("h3.noPingsYet.hide").show();
        }
        else {
            if (window.app.pingBox.pings.models.length == 1) {
                if (typeof(window.app.pingBox.pings.models[0].attributes.true) == 'object') {
                    window.app.pingBox.pings.models.shift();
                    $("h3.noPingsYet.hide").show();
                }
            }
            else {
                $("h3.noPingsYet.hide").hide();
            }
        }
    }
    // toggleItemDetailModal: function(e) {
    //     $("#postItemModal").toggle()
    // }
});

// On Page Loads
$(document).ready(function() {

    // chosen dropdown
    $(".chzn-select").chosen()
    $(".chzn-select-deselect").chosen({
        allow_single_deselect: true
    });

    // handles drag and drop
    function handleDrag(e) {
        if (e.type == 'dragenter') {
            $('#upload').addClass('drop');
        } else if ((e.type == 'dragleave') || (e.type == 'drop')) {
            $('#upload').removeClass('drop');
        }

        e.stopPropagation();
        e.preventDefault();
    }
    $('#upload').bind('dragenter', handleDrag).bind('dragleave', handleDrag).bind('dragover', handleDrag);
    $('#upload').get(0).ondrop = function(e) {
        handleDrag(e);

        if (!e.dataTransfer.files) {
            alert('Dropping files is not supported by your browser.');
            return;
        }

        window.files = e.dataTransfer.files;

        // handleUploads(files);
    };

    // scroll back to top indicator
    // hide #back-top first
    $("#back-top").hide();

    // fade in #back-top
    $(function() {
        $(window).scroll(function() {
            if ($(this).scrollTop() > 100) {
                $('#back-top').fadeIn();
            } else {
                $('#back-top').fadeOut();
            }
        });

        // scroll body to 0px on click
        $('#back-top a').click(function() {
            $('body,html').animate({
                scrollTop: 0
            },
            800);
            return false;
        });
    });


    //initialize
    window.app = new Pixiphi.App();
    // declare a new Pixiphi page instance
    window.app.page = new Pixiphi.Page();
    window.app.initialCities = ["New York", "San Francisco", "Columbus", "South Beach", "Parkmerced", "Denver"];
    window.app.initialCategoriesForSale = ["Apple", "Appliances", "Arts", "Bikes", "Boats", "Books", "PC/Computers", "Cars", "Electronics", "Furnitures", "Sport Goods", "Tickets", "Tools", "Toys/Games", "Video Games"];
    // load drop down
    console.log();
    _.each($("a.category"),
    function(a) {
        $(a).attr("href", "#/category>" + $(a).html().replace(" ", ""))
    })


    window.app.observedModel = {}
    window.app.pingQueue = {};
    window.app.pingUserInfo = {}

    // allowed image extensions
    window.app.allowedExtensions = ["jpg", "jpeg", "png"];

    // save this user info
    var userProfileUrl = "https://api.twitter.com/1/users/show.json?user_id=" + $('#userId').html() + "&include_entities=true";
    
    // keep a record
    // if (_.has(window.app.pingUserInfo, $('#userId').html())) {
    //     var userProfilePic = $("img.userProfilePic");
    //     $(userProfilePic).attr("src", window.app.pingUserInfo[$('#userId').html()].src);
    // }
    // else {
    //     $.ajax({
    //         url: userProfileUrl,
    //         dataType: "jsonp",
    //         success: function(data) {
    //             // keep a record
    //             if (!_.has(window.app.pingUserInfo, $('#userId').html())) {
    //                 window.app.pingUserInfo[$('#userId').html()] = new Image();
    //                 window.app.pingUserInfo[$('#userId').html()].src = data.profile_image_url;
    //             }
    //         }
    //     })
    // }

    // TEMP
    // ------------------------------------------------------------
    // keep a record
    if(!_.has(window.app.pingUserInfo, $('#userId').html())) {
        window.app.pingUserInfo[$('#userId').html()] = new Image();
        window.app.pingUserInfo[$('#userId').html()].src = "/images/wood.gif";
    }
    // ------------------------------------------------------------

    // Get PINGS
    // --------------------------------------------------------
    if (typeof(window.app.pingBox) != 'object') {
        window.app.pingBox = new Pixiphi.PingBox(new Pixiphi.Pings(true));
        window.app.pingBox.pings.fetch({
            data: {
                "user": {
                    name: $('#userName').html(),
                    id: $('#userId').html()
                }
            }
        });
    }

    Backbone.history.start();


})










