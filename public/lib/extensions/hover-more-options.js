(function($) {

    $.hover_caption = {
        defaults: {
            caption_font_size: '18px',
            caption_color: 'white',
            caption_bold: true,
            caption_default: "Click for screenshots."
        }
    }

    $.fn.extend({
        hover_caption: function(config, thisUserSubmittedPost) {

            var config = $.extend({},
            $.hover_caption.defaults, config);
            return this.each(function() {

                var image = $(this);

				var imgSrc = $(image).attr("src");
				
				var thisUserSubmitted = false;
				if (_.indexOf(thisUserSubmittedPost, imgSrc) != -1) {
					thisUserSubmitted = true;
				}
				
                // set variable for wrapper div
                // var width = image.width();
                // var height = image.height();
				var width = "360px";
				var height = "360px";

                // variables for caption
                var caption_padding = width * .07;
                // dynamic depending on img width
                //  set caption to title attr if set
                var caption = image.attr('title') ? image.attr('title') : config.caption_default;
				
				if (thisUserSubmitted) {
					var postOptions = _.template($("#postOptionsWithoutPingTemplate").html(), {});
				}
				else {
					var postOptions = _.template($("#postOptionsTemplate").html(), {});
				}
				
                // add necessary html and css
                image
                .css({
                    'z-index': '-1',
                    'position': 'relative'
                })
                .wrap('<div>')
                .parent()
                .css({
                    'width': width,
                    'height': height
                })
                // .prepend('<h3>' + caption + '</h3>')
				.prepend(postOptions)
                .find('#postOp')
                .addClass('hover_caption_caption')
                // use this hook for additional styling
                .css({
                    // 'padding': "0px",
                    'color': config.caption_color,
                    'width': width,
					'height': height,
                    'font-size': config.caption_font_size,
                    'position': 'absolute',
                    'margin-top': "110px",
					'margin-left': "125px"
                })
                .hide();

                if (config.caption_bold) {
                    image.css('font-weight', 'bold')
                };

                // add hover event to toggle message
                image.parent().hover(function() {
                    $(this).addClass('hover_caption').find('#postOp').show();
                },
                function() {
                    $(this).removeClass('hover_caption').find('#postOp').hide();
                });

            })
        }
    })

})(jQuery);