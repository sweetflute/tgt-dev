// submit settings from settings form
// generic alert on success
$(document).on("click","button#save_settings",function(e) {
    // console.log($( "form#settings" ).serialize());
    data_in = "reminder_days="
    if ($('input#send_reminders_true').prop('checked'))
        data_in += $('input#reminder_days').val();
    else
        data_in += -1
    if($('input#settings_wall').prop('checked'))
        data_in += "&default_fb=on"
    if($('input#settings_public').prop('checked'))
        data_in += "&default_public=on"
    console.log(data_in)
    $.post( "/settings",data_in).done(function(data) {
        $('#settings_modal').modal('hide');
        
        // Update settings when post done
        $('input#settings_wall').prop('checked', data.default_fb);
        $('input#settings_public').prop('checked', data.default_public);
        console.log(data.reminder_days);
        if (data.reminder_days >= 0) {
            $('input#reminder_days').val(data.reminder_days);
            $('input#send_reminders_true').prop('checked', true).button("refresh");
            $('input#send_reminders_false').prop('checked', false).button("refresh");
        } else {
            $('input#send_reminders_false').prop('checked', true).button("refresh");
            $('input#send_reminders_true').prop('checked', false).button("refresh");
        }
    });
    // get_settings();
});

$(document).on("click","button#close_settings",function(e) {
  get_settings();
});

// submit a new post
// clear form on success
$(document).on("click","#submit_good_thing",function(e) {
    //console.log($( "#post" ).serialize());
    //TODO: check required field
    $("form#post").find('[required]').each(function(){
        if($(this).val() == ''){
            $(this).focus();
            alert("Good Thing is required!");
            e.preventDefault();
        }
    });

    var timezone_offset = (new Date().getTimezoneOffset())/60;
    var mention_list = JSON.stringify($('#magic_friend_tagging').magicSuggest().getSelection());
    // var img_url = $("#img").file[0];
    // var data_in = new FormData($("#post"));
    // data_in.append("img", img_url);
    // data_in.append("tzoffset", timezone_offset);
    // data_in.append("mentions", mention_list);
    // data_in.append("view", "");    
    var data_in = $( "#post" ).serialize() + '&tzoffset=' + timezone_offset + '&mentions=' + mention_list + '&view=';
    console.log(data_in);
    $.post("/post",data_in)
        .done(function(data){
            $('input#good_thing, input#reason, input#img').val('');
            $('#magic_friend_tagging').magicSuggest().clear();
            get_settings();
            get_posts(data);
            get_stats();
        });
    return false;
});



$(document).on("click","a#cheer",function(e) {
    var cheer = $(this)
    var url_data = 'good_thing=' + cheer.parents('div#data_container').data('id');
        $.post( "/cheer",url_data).done(function(data){
            if (data.cheered) {
                var result = '(' + data.cheers + ') uncheer';
            } else {
                var result = '(' + data.cheers + ') cheer';
            }
            cheer.text(result);
        });
        return false;
});


// delete a post or comment
$(document).on("click","a#delete",function(e) {
    var id = $(this).parents('div#data_container').data('id');
    var type = $(this).parents('div#data_container').data('type');
    var url_data = 'id=' + id + '&type=' + type;
    $.post( "/delete",url_data).done(function(data){
        if (type == 'comment') {
            console.log('deleting a comment')
            var result = data.num_comments + ' comments'
            $('div[data-id="'+id+'"]').parents('div#data_container').find('a#comment').text(result);
            $('div[data-id="'+id+'"]').remove();
        } else {
            console.log('deleting a good thing');
            console.log($('div[data-id="'+id+'"]').parents('li#good_thing'));
            $('div[data-id="'+id+'"]').parents('li#good_thing').remove();
            get_stats();
        }
    });
    return false;
});

// save a comment
$(document).on("submit","form#comment",function(e) {
    var good_thing = $(this);
    var url_data = $( this ).serialize() + '&good_thing=' + $( this ).parents('div#data_container').data('id');
    $.post( "/comment",url_data).done(function(data){
        good_thing.trigger("reset");
        var id = good_thing.parents('div#data_container').data('id');
        get_comments(data,id);
    });
    return false;
});

// get all comments
$(document).on("click","a#comment",function(e) {
    var good_thing = $(this);
    if (good_thing.data('toggle') === 'off') {
        var url_data = 'good_thing=' + good_thing.parents('div#data_container').data('id');
        $.post( "/comment",url_data).done(function(data){
            var id = good_thing.parents('div#data_container').data('id');
            get_comments(data,id);
        });
        good_thing.data('toggle', 'on');
        return false;
    } else if (good_thing.data('toggle') === 'on'){
        good_thing.parents('div#data_container').find('div#comments').text('');
        good_thing.data('toggle', 'off');
        return false;
    }
});

// on page load
window.onload = function() {
    $( document ).ready(function() {
        
        load_all_post();
        change_view();
        tag_friends();

    });
};

// get all posts on page load
function load_all_post(){

        var view = 'view=all';
        // // var timezone_offset = 0 - (new Date().getTimezoneOffset())/60;
        // var timezone_offset = (new Date().getTimezoneOffset())/60;
        // var data_in = view + '&tzoffset=' + timezone_offset

        $.post( "/post", view).done(function(data){
            get_posts(data);
        });
        // get user settings
        get_settings();
        // get user stats
        get_stats();
        // get unread notifications
        $.get('/notify','').done(function(data) {
            get_notifications(data);
        })
}

// $( document ).ready(function() {
//    change_view();
//    tag_friends();

//    console.log("local_time.length()=" + $(".local-time").length);
//    // .forEach(function(){
//         // $(this).html(localize_time());
//    // });
   
// });

// change views
function change_view(){
    $( "a#view_select" ).click(function( event ) {
        // var timezone_offset = (new Date().getTimezoneOffset())/60;
        var data = 'view=' + $(this).data('view');
        $.post( "/post", data).done(function (data) {
            $('ul#good_things').empty();
            get_posts(data);
        });
        return false;
    });
}

//friend tagging with magicsuggest
function tag_friends(){
    var friend_ids = JSON.parse(localStorage['friend_ids']);
    $("input#magic_friend_tagging").magicSuggest({
        placeholder: "Tag Friends",
        allowFreeEntries: false,
        data: friend_ids,
        displayField: 'name',
       // valueField: 'id'
    });
}

//adjust created time to local timezone
function localize_time(created_time){
    
    var ms_min = 60*1000;
    var ms_hour = 60*60*1000;

    var created_time_local = new Date(created_time).getTime() - new Date().getTimezoneOffset()*ms_min
    var local_date = new Date(created_time_local);

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate()-1);

    var time_diff = new Date().getTime() - created_time_local;
    console.log(new Date(created_time));
    console.log(local_date);
    console.log(new Date());
    console.log(time_diff);
 


    var weekday = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var time_display = "";

    if(local_date.getDate() == today.getDate()){
        if (time_diff > ms_hour){
            time_display =  "earlier today";
        }else if (time_diff == ms_hour){
            time_display = "an hour ago";
        }else{
            if (time_diff > ms_min && time_diff < ms_hour){
                time_display = Math.round(time_diff/ms_min) + " minutes ago";
            }else{
                 time_display = "a moment ago";
            }
        }
    }else if (local_date.getDate() == yesterday.getDate()){
        time_display = "yesterday";
    }else if(today.getDate() - local_date.getDate() < 7){
        time_display = weekday[local_date.getDay()];
    }else{
        time_display = local_date.getMonth() + "/" + local_date.getDate() + ", " + weekday[local_date.getDay()];
    }

    return time_display;

}
// view a user profile
/*$(document).on("click","a#profile_link",function(e) {
    var url_data = 'view=' + $(this).parents('div#data_container').data('user_id');
    $.post( "/post",url_data).done(function (data) {
        $('ul#good_things').empty();
        get_posts(data);
    });
    return false;
});*/

// render posts from template and json data
function get_posts(post_list) {
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        post_list.forEach(function(data) {
            // Fetch the <script /> block from the loaded external
            // template file which contains our greetings template.
            var template = $(templates).filter('#good_thing_tpl').html();
            $('ul#good_things').prepend(Mustache.render(template, data));
        });


        $(".local-time").each(function(){
            var created_time = $(this).html();
            $(this).html(localize_time(created_time));
            $(this).attr("class", ".local-time-done");
        });
    });
}

function get_comments(comment_list,id) {
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        comment_list.forEach(function(data) {
            // Fetch the <script /> block from the loaded external
            // template file which contains our greetings template.
            var template = $(templates).filter('#comment_tpl').html();
            $('div#data_container[data-id="'+id+'"]').find('div#comments').prepend(Mustache.render(template, data));
        });
    });
}

function get_stats() {
    var data_in = '&tzoffset=' + (new Date().getTimezoneOffset())/60;
    $.post( "/stat",data_in).done(function (data) {
        $('div#progress').css('width',data.progress);
        $('span#progress').text(data.progress + ' Complete');
        $('#good_things_today').text(data.posts_today + ' Good Things Today');
        $('#good_things_total').text(data.posts + ' Total Good Things');
        $.get('static/templates/good_thing_tpl.html', function(templates) {
            $('div#word_cloud').empty();
            data.word_cloud.forEach(function(data) {
                var template = $(templates).filter('#word_cloud_tpl').html();
                $('div#word_cloud').prepend(Mustache.render(template, data));
            });
            $.fn.tagcloud.defaults = {
                size: {start: 12, end: 18, unit: 'pt'},
                color: {start: '#777', end: '#777'}
            };
            $(function () {
                $('#word_cloud a').tagcloud();
            });
        });
    });
}

function get_settings() {
    $.get( "/settings",'')
        .done(function(data) {
            $('input#settings_wall').prop('checked', data.default_fb);
            $('input#settings_public').prop('checked', data.default_public);
            if (data.reminder_days >= 0) {
                $('input#reminder_days').val(data.reminder_days);
                $('input#send_reminders_true').prop('checked', true).button("refresh");
                $('input#send_reminders_false').prop('checked', false).button("refresh");
            } else {
                $('input#send_reminders_false').prop('checked', true).button("refresh");
                $('input#send_reminders_true').prop('checked', false).button("refresh");
            }
        });
    return false;
}

function get_notifications(notification_list) {
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        if (notification_list.length > 0) {
            notification_list.forEach(function(data) {
                var template;
                if (data.event_type === 'comment') {
                    template = $(templates).filter('#comment_notification_tpl').html();
                } else if (data.event_type === 'cheer') {
                    template = $(templates).filter('#cheer_notification_tpl').html();
                } else if (data.event_type === 'mention') {
                    template = $(templates).filter('#mention_notification_tpl').html();
                }
                $('ul#notifications').prepend(Mustache.render(template, data));
            });
        } else {
            var template = $(templates).filter('#blank_notification_tpl').html();
            $('ul#notifications').prepend(Mustache.render(template));
        }
    });
}

window.fbAsyncInit = function() {
    FB.init({
        appId      : "997456320282204", // App ID
        version: 'v2.0',
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        xfbml      : true  // parse XFBML
    });


    // logout handler
    $(document).on("click","a#logout",function(e) {
        logout()
    });

    // get friend list on login and store for friend tagging
    FB.getLoginStatus(function(response){
        var friend_ids = [];
        var friend_app_ids = {};
        // get list of friends who use 3gt
        FB.api("/me/friends",function (response) {
            if (response && !response.error) {
                response.data.forEach(function(friend_data) {
                    friend_app_ids[friend_data.name] = friend_data.id.toString();
                });
                console.log(friend_app_ids);
                // get list of taggable fb friends
                FB.api("/me/taggable_friends",function (response) {
                    if (response && !response.error) {
                        response.data.forEach(function(friend_data) {
                            friend = {
                                'name':friend_data.name,
                                'id':friend_data.id.toString()
                            };
                            // if the a taggable friend uses 3gt, store the user id
                            if (friend_data.name in friend_app_ids) {
                                console.log(friend_app_ids[friend_data.name]);
                                friend.app_id = friend_app_ids[friend_data.name];
                                console.log(friend);
                            }
                            friend_ids.push(friend);
                        });
                        localStorage['friend_ids'] = JSON.stringify(friend_ids);
                    } else {
                        console.log(response.error)
                    }
                });
            } else {
                console.log(response.error)
            }
        });
    });
};

// Load the SDK Asynchronously
(function(d){
    var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
    js = d.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    d.getElementsByTagName('head')[0].appendChild(js);
}(document));

// logout function
function logout() {
    FB.logout(function(response) {
        if (response && !response.error) {
            window.location = "http://tgt-dev.appspot.com/logout";
        } else {
            console.log(response.error)
        }
    });
}

// notification click listener
$(document).on("click","a#notification_link",function(e) {
    $('html, body').animate({
        scrollTop: $( $(this).attr('href') ).offset().top -70
    }, 500);
    return false;
});
