var current_view = 'all';
var old_cursor = '';


$(document).on('click','.glyphicon-camera', function(e){  
    if ($(this).data('select') === 'on') {
        $("#icon-photo").css("color", "#333");
        $('.form-group :file').wrap('<form>').closest('form').get(0).reset();
        $('.form-group :file').unwrap();
        e.preventDefault();
        $(this).data('select','off');
        $('#filename').text('');
    }
});

$(document).on('change', '.form-group :file', function() {
    var input = $(this),
    numFiles = input.get(0).files ? input.get(0).files.length : 1,
    label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
    $('.glyphicon-camera').data('select','on');
});

$(document).on('input', "input#good_thing", function(){
    if($("input#good_thing").val())
        $("#submit_good_thing").prop('disabled', false);
    else
        $("#submit_good_thing").prop('disabled', true);
    // if ($("input#good_thing").val().length >= 1){
    //     $("#submit_good_thing").prop('disabled', false);
        // $("#submit_good_thing").removeClass('disabled');
    // }
});

// $(document).on('change', "input#good_thing", function(){
//     $("#submit_good_thing").removeClass('disabled');
// });

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
    data_in += "&email=" + $('input#email_setting').val();
    if($('input#short_name').prop('checked'))
        data_in += "&display_name=" + $('input#short_name').next().html();
    else
        data_in += "&display_name=" + $('input#long_name').next().html();
    console.log(data_in)
    $.post( "/settings",data_in).done(function(data) {
        $('#settings_modal').modal('hide');
        $('.modal-backdrop').remove();
        
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

$(document).on("click", ".glyphicon-user", function(){
    if ($(this).data('select') === 'off') {
        $("#div_friend_tagging").css("display", "table");
        $("#icon-user").css("color", "#337ab7");
        $(this).data('select', 'on');
    }else if ($(this).data('select') === 'on') {
        $("#div_friend_tagging").css("display", "none");
        $('#magic_friend_tagging').magicSuggest().clear();
        $("#icon-user").css("color", "#333");
        $(this).data('select', 'off');
    } 
});

// submit a new post
// clear form on success
$(document).on("click","#submit_good_thing",function(e) {
    console.log($( "#post" ).serialize());
    //TODO: check required field
    // $("form#post").find('[required]').each(function(){
    //     if($(this).val() == ''){
    //         $(this).focus();
    //         alert("Good Thing is required!");
    //         e.preventDefault();
    //         return false;
    //     }
    // });

    var timezone_offset = (new Date().getTimezoneOffset())/60;
    var mention_list = JSON.stringify($('#magic_friend_tagging').magicSuggest().getSelection());
    // console.log(mention_list)
    var img_file = $("#img")[0].files[0];
    var upload_url = $("#img").attr('data-url');
    // console.log(upload_url)
    // alert(img_file.name);
    var data_in = new FormData(document.querySelector("#post"));
 

    if (img_file != null)
        data_in.append("img", img_file);
    data_in.append("tzoffset", timezone_offset);
    data_in.append("mentions", mention_list);
    data_in.append("view", "");

    // $("#submit_good_thing").val("Posting...");
    // $("#submit_good_thing").css("font-size","10px");
    $("#submit_good_thing").prop("disabled","true");
    $('body').css('cursor','progress');
    $("#submit_good_thing").css("background-color","#cccccc");
    // $("#submit_good_thing").css("display","none");
    console.log($('#good_thing').text());

    $.get("/upload").done(function(data){
        upload_url = data.upload_url;
        console.log(upload_url);

        $.ajax({
          // url: "/post",
          url: upload_url,
          data: data_in,
          cache: false,
          processData: false,
          contentType: false,
          enctype: 'multipart/form-data',
          type: 'POST',

          success: function(data) {
            // alert("ajax success");
            $('input#good_thing, input#reason, input#img').val('');
            $('#magic_friend_tagging').magicSuggest().clear();
            get_settings();
            get_posts(data, true);
            get_stats();

            // $("#submit_good_thing").val("Post");
            // $("#submit_good_thing").prop("disabled","true");
            // $("#posting").css("display","none");
            $("#submit_good_thing").css("background-color","#59b329");
            $('body').css('cursor','default');
            $("#div_friend_tagging").css("display", "none");
            $("#icon-user").css("color", "#333");
            $("#icon-user").data('select', 'off');
            $("#filename").css("display", "none");
            $("#icon-photo").css("color", "#333");
            $("#icon-photo").data('select', 'off');

          }
        });
    });
    return false;
});



$(document).on("click","a#acheer",function(e) {
    var cheer = $(this);
    var url_data = 'good_thing=' + cheer.parents('div#data_container').data('id');
        $.post( "/cheer",url_data).done(function(data){
            if (data.cheered) {
                var result = '(uncheer)';
                cheer.prev('span#cheer').html('<a href="#" class="dropdown-toggle" data-toggle="dropdown" id="cheers">'
                                   + data.cheers + ' cheers </a>');
            } else {
                var result = '(cheer)';
                console.log("data.cheers=" + data.cheers);
                if(data.cheers == '0'){
                    cheer.prev('span#cheer').text('0 cheer ');
                }
                else
                    cheer.prev('span#cheer').html('<a href="#" class="dropdown-toggle" data-toggle="dropdown" id="cheers">'
                                   + data.cheers + ' cheers </a>');
            }
            // if (data.cheers != '0')
            //     cheer.prev('span#cheer').text(data.cheers + ' cheer ');
            // else
            //     cheer.prev('a#cheers').text(data.cheers + ' cheer ');

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
            var comment_a = $('div[data-id="'+id+'"]').parents('div#data_container').find('#comment');
            var num_comments = parseInt(comment_a.text().split('')[0]) - 1;
            console.log(comment_a.data('toggle'));
            if(num_comments > 0){
                if(comment_a.data('toggle') === 'on')
                    var result = '<a href="#" class="link" data-toggle="on" id="comment">' + num_comments + ' comment(s)</a>';
                else
                    var result = '<a href="#" class="link" data-toggle="off" id="comment">' + num_comments + ' comment(s)</a>';
            }
            else
                var result = '<span id="comment">' + data.num_comments + ' comment(s)</span>';
            var div_more = comment_a.parents('div#data_container').find('#more');
            div_more.remove();
            // var result = "(" + data.num_comments + ') comments'
            comment_a.replaceWith(result);
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
$(document).on("keydown", "form#comment_form", function(e){
    // console.log($(this).attr("id"));
    comment_text = $(this).children("#comment_text");
    // console.log(comment_text.attr("id"));
    // console.log($("#comment_text").attr("placeholder"));
    if(e.which == 13) {
        // console.log($("#comment_text").val());
        e.preventDefault();
        if (comment_text.val() != "" && comment_text.val() != comment_text.attr("placeholder"))
            $("form#comment_form").submit();
    }
});
// $("form#comment_form").keypress(function(e){
//     e.preventDefault();
//     console.log($("#comment_text").val());
//     console.log($("#comment_text").attr("placeholder"));
//     if(e.which == 13 && $("#comment_text").val() != "" && $("#comment_text").val() != $("#comment_text").attr("placeholder"))
//         $("form#comment_form").submit();
// });

$(document).on("submit","form#comment_form",function(e) {
    var good_thing = $(this);
    var url_data = $( this ).serialize() + '&good_thing=' + $( this ).parents('div#data_container').data('id');
    $.post( "/comment",url_data).done(function(data){
        good_thing.trigger("reset");
        var id = good_thing.parents('div#data_container').data('id');

        // get_comments(data,id);
        var comment_a = good_thing.parents('div#data_container').find('#comment');
        var num_comments = parseInt(comment_a.text().split('')[0]) + 1;
   
        console.log(comment_a.data('toggle'));
        
        if (comment_a.data('toggle') === 'on'){
            var result = '<a href="#" class="link" data-toggle="on" id="comment">' + num_comments + ' comment(s)</a>';
            var to_clear = false;
        }else{
            var result = '<a href="#" class="link" data-toggle="off" id="comment">' + num_comments + ' comment(s)</a>';
            var to_clear = true;
        }

        if(num_comments > 0){
            if(num_comments > 1 && comment_a.data('toggle') === 'off')
                get_comments(data,id, true, to_clear);
            else
                get_comments(data,id, false, to_clear);
        }else{
            var result = '<span id="comment">' + num_comments + ' comment(s)</span>';
        }
        
        comment_a.replaceWith(result);
    });
    return false;
});

// get all comments
$(document).on("click","a#comment",function(e) {
    var good_thing = $(this);
    // console.log(good_thing);
    console.log(good_thing.data('toggle'));
    if (good_thing.data('toggle') === 'off') {
        var url_data = 'good_thing=' + good_thing.parents('div#data_container').data('id');
        $.post( "/comment",url_data).done(function(data){
            var id = good_thing.parents('div#data_container').data('id');
            get_comments(data,id,false, true);
        });
        good_thing.data('toggle', 'on');
        return false;
    } else if (good_thing.data('toggle') === 'on'){
        good_thing.parents('div#data_container').find('div#comments').text('');
        good_thing.data('toggle', 'off');
        return false;
    }
});

// click on more comment
$(document).on("click","div#more > a",function(e) {
    var good_thing = $(this);
    var comment_a = good_thing.parents('div#data_container').find('#comment');
    console.log(comment_a.data('toggle'));
    var url_data = 'good_thing=' + good_thing.parents('div#data_container').data('id');
    $.post( "/comment",url_data).done(function(data){
        var id = good_thing.parents('div#data_container').data('id');
        get_comments(data,id,false, true);
    });
    comment_a.data('toggle', 'on');
    console.log("after more:" + comment_a.data('toggle'));
    return false;
});
// reset notification
$(document).on("click","#notification_icon",function(e) {
    $('#notification_count').html(0);
    $('#notification_count').css("opacity", 0);
});

$(document).on("click","#word_cloud > a",function(e) {
    // alert($(this).text());
    var goodthing_word = $(this).text();
    var url_data = "user_id=&goodthing_word=" + goodthing_word;

    $.get("/search", url_data).done(function(data){
        get_search(data);
    });
});

$(document).on("click","#reason_cloud > a",function(e) {
    var reason_word = $(this).text();
    var url_data = "user_id=&reason_word=" + reason_word;

    $.get("/search", url_data).done(function(data){
        get_search(data);
    });
});

$(document).on("click","#friend_cloud > a",function(e) {
    var friend_word = $(this).text();
    var url_data = "user_id=&friend_word=" + friend_word;

    $.get("/search", url_data).done(function(data){
        get_search(data);
    });
});


//search for wordcloud
var loading = false;
$(window).scroll(function(){
    if($(window).scrollTop() == $(document).height() - $(window).height())
    {
        
        if(!loading){
            $('#good_things').append('<li class="list-group-item" id="loading">loading ...</li>');
            loading = true;
        }
        console.log("scholl=" + $('#next').attr('data-name'));
        // console.log("old_cursor=" + old_cursor);
        // if(old_cursor != $('#next').attr('data-name')){
        if($('#next').attr('data-name') != ""){
            var data_in = "view=" + current_view + "&cursor=" + $('#next').attr('data-name');
            console.log("scholl:" + data_in);
            $.post( "/post", data_in).done(function (data) {
                // $('ul#good_things').empty();
                $('li#loading').remove();
                loading = false;
                get_posts(data, false);
            });
        }
    }
});

// on page load
window.onload = function() {
    $( document ).ready(function() {   
        load_all_post();
        change_view();
        tag_friends();
        save_email();
        // search_words();

        $('.form-group :file').on('fileselect', function(event, numFiles, label) {
        
            var input = $('#filename'),
                log = numFiles > 1 ? numFiles + ' files selected' : label;
            
            if( input.length ) {
                input.text(log);
                input.css("display","block");
                $("#icon-photo").css("color", "#337ab7");
            } else {
                if( log ) alert(log);
            }
            
        });


        $('.carousel-next-public').click(function(){
            $('#tutorial-slider-public').carousel('next');
        });

        $('[data-toggle="tooltip"]').tooltip();
        $('#post').validate();

    });
};


// get all posts on page load
function load_all_post(){

        var view = 'view=all';
        current_view = "all";
        // var cursor = "";
        // if($('#current-cursor').attr('data-name') != null)
        //     cursor = $('#current-cursor').attr('data-name');
        // alert(cursor);
        var data_in = view + '&cursor=' + $('#next').attr('data-name');
        // console.log(data_in);
        $.post( "/post", data_in).done(function(data){
            get_posts(data, false);
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


// change views
function change_view(){
    $( "a#view_select" ).click(function( event ) {
        // var timezone_offset = (new Date().getTimezoneOffset())/60;
        $('body').css('cursor','progress');
        current_view = $(this).data('view');
        // var cursor = "";
        // if($('#current-cursor').attr('data-name') != null)
        //     cursor = $('#current-cursor').attr('data-name');
        // var data = 'view=' + current_view + '&cursor=' + $('#next').attr('data-name');
        var data = 'view=' + current_view + '&cursor=';

        $.post( "/post", data).done(function (data) {
            $('body').css('cursor', 'default');
            $('ul#good_things').empty();
            get_posts(data,false);
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

//search posts based on word tags
function search_tags(){
    $("#word_cloud a").click(function(){
        current_view = "search";

        var data = 'view=' + current_view + '&cursor=';

        $.post( "/post", data).done(function (data) {
            $('ul#good_things').empty();
            get_posts(data,false);
        });
        return false;
    });
}
//adjust created time to local timezone
function localize_time(created_time){
    
    var ms_min = 60*1000;
    var ms_hour = 60*60*1000;

    var cts = created_time.split(/[\s.:-]+/);
    var created_time_local = new Date(cts[0],parseInt(cts[1]-1),cts[2],cts[3],cts[4],cts[5],cts[6]).getTime() - new Date().getTimezoneOffset()*ms_min
    var local_date = new Date(created_time_local);


    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate()-1);

    var time_diff = today.getTime() - created_time_local;

    // console.log(today);
    // console.log(local_date);
    // console.log(time_diff);

    var weekday = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var time_display = "";

    if((local_date.getDate() == today.getDate()) && (local_date.getMonth() == today.getMonth())){
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
    }else if ((local_date.getDate() == yesterday.getDate()) && (local_date.getMonth() == yesterday.getMonth())){
        time_display = "yesterday";
    }else if(time_diff > 24*ms_hour && time_diff < 7*24*ms_hour){
        time_display = weekday[local_date.getDay()];
    }else{
        time_display = local_date.getMonth() + 1 + "/" + local_date.getDate() + ", " + weekday[local_date.getDay()];
    }

    return time_display;

}

function save_email(){
    email = Cookies.get('liame');
    if(email != null){
        Cookies.remove('liame');
        data_in = "reminder_days=-1&defult_fb=off&default_public=on&email=" + email;
        if($('input#short_name').prop('checked'))
        data_in += "&display_name=" + $('input#short_name').next().html();
    else
        data_in += "&display_name=" + $('input#long_name').next().html();
        alert(data_in);
        $.post( "/settings",data_in);
    }
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
function get_posts(post_list, posting) {
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        // console.log(post_list[0] + ":" + Object.keys(post_list[0]).length);

        if(post_list.length == 1 && Object.keys(post_list[0]).length == 2){
            $('#img').attr('data-url', post_list[0].upload_url);
            $('#next').attr('data-url', post_list[0].cursor);
        }else{
            post_list.forEach(function(data) {
                // Fetch the <script /> block from the loaded external
                // template file which contains our greetings template.
                var template = $(templates).filter('#good_thing_tpl').html();
                if (posting)
                    $('ul#good_things').prepend(Mustache.render(template, data));
                else
                    $('ul#good_things').append(Mustache.render(template, data));

            });

            //check a#comment and span#comment 

            // $("a#comment").each(function(){
            $("a#comment, span#comment").each(function(){
                var good_thing = $(this); 
                // console.log(good_thing.html());           
                var url_data = 'good_thing=' + good_thing.parents('div#data_container').data('id');
                $.post( "/comment",url_data).done(function(data){
                    // console.log(data.length);  
                    var id = good_thing.parents('div#data_container').data('id');
                    if(data.length > 1){
                        get_comments(data.slice(0,1),id, true, true);
                        good_thing.data('toggle', 'off');
                    }else if(data.length == 1){
                        get_comments(data.slice(0,1),id, false, true);
                        good_thing.data('toggle', 'on');
                    }
                });
                
            });

            $(".local-time").each(function(index){
                var created_time = $(this).html();
                $(this).html(localize_time(created_time));

                if($(this).attr('data-name') != null && !posting){
                    // console.log($('#next').attr('data-name'));
                    old_cursor = $('#next').attr('data-name');
                    $('#next').attr('data-name', $(this).attr('data-name'));
                    // console.log($('#next').attr('data-name'));
                    
                }

                if (index == 1)
                 if($(this).attr('data-url') != null)
                    $('#img').attr('data-url', $(this).attr('data-url'));

                $(this).attr("class", ".local-time-done");
            });
        }
    });
}

function get_comments(comment_list,id, has_more, to_clear) {
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        var comment_section = $('div#data_container[data-id="'+id+'"]').find('div#comments');
        if(to_clear)
            comment_section.empty();
        comment_list.forEach(function(data) {
            // Fetch the <script /> block from the loaded external
            // template file which contains our greetings template.
            var template = $(templates).filter('#comment_tpl').html();
            
            comment_section.append(Mustache.render(template, data));

            if(has_more){
                var template_more = $(templates).filter('#more_tpl').html();
                comment_section.append(Mustache.render(template_more, data));
            }

            $(".comment-time").each(function(index){
                var created_time = $(this).html();
                $(this).html(localize_time(created_time));
                $(this).attr("class", "comment-time-done");
            });
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
        $('#good_things_total').tooltip({
            'title': data.average_posts + ' posts per day',
            'placement': 'bottom'});
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

            $('div#reason_cloud').empty();
            
            data.reason_cloud.forEach(function(data) {
                var template = $(templates).filter('#word_cloud_tpl').html();
                $('div#reason_cloud').prepend(Mustache.render(template, data));
            });
            $.fn.tagcloud.defaults = {
                size: {start: 12, end: 18, unit: 'pt'},
                color: {start: '#777', end: '#777'}
            };
            $(function () {
                $('#reason_cloud a').tagcloud();
            });

            $('div#friend_cloud').empty();
            data.friend_cloud.forEach(function(data) {
                var template = $(templates).filter('#word_cloud_tpl').html();
                $('div#friend_cloud').prepend(Mustache.render(template, data));
            });
            $.fn.tagcloud.defaults = {
                size: {start: 12, end: 18, unit: 'pt'},
                color: {start: '#777', end: '#777'}
            };
            $(function () {
                $('#friend_cloud a').tagcloud();
            });
        });
    });
}

function get_settings() {
    $.get( "/settings",'')
        .done(function(data) {
            $('input#short_name').next().html(data.short_name);
            $('input#long_name').next().html(data.user_name);
            if(data.same_name){
                $('input#long_name').prop('checked', true).button("refresh"); 
                $('input#short_name').prop('checked', false).button("refresh");
            }else{
                $('input#short_name').prop('checked', true).button("refresh");
                $('input#long_name').prop('checked', false).button("refresh");
            }

            $('input#settings_wall').prop('checked', data.default_fb);
            $('input#settings_public').prop('checked', data.default_public);
            $('input#email_setting').val(data.email);
            if (data.reminder_days > 0) {
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
            $('#notification_count').html(notification_list.length);
            $('#notification_count').css("opacity", 1);
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
            $('#notification_count').css("opacity", 0);
            var template = $(templates).filter('#blank_notification_tpl').html();
            $('ul#notifications').prepend(Mustache.render(template));
        }
    });
}

function get_search(post_list) {
    // console.log("in get_search");
    // console.log(post_list);
    $.get('static/templates/good_thing_tpl.html', function(templates) {
        // console.log(post_list[0] + ":" + Object.keys(post_list[0]).length);
        $('ul#good_things').empty();
        $('#next').attr('data-name',"");
        post_list.forEach(function(data) {
            // Fetch the <script /> block from the loaded external
            // template file which contains our greetings template.
            var template = $(templates).filter('#good_thing_tpl').html();
            $('ul#good_things').append(Mustache.render(template, data));
        });


            $(".local-time").each(function(index){
                var created_time = $(this).html();
                $(this).html(localize_time(created_time));

                if (index == 1)
                 if($(this).attr('data-url') != null)
                    $('#img').attr('data-url', $(this).attr('data-url'));

                $(this).attr("class", ".local-time-done");
            });
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
        logout();
    });

    // get friend list on login and store for friend tagging
    FB.getLoginStatus(function(response){

        if(response.status === 'connected'){
            var friend_ids = [];
            var friend_app_ids = {};
            // get list of friends who use 3gt
            FB.api("/me/friends",function (response) {
                if (response && !response.error) {
                    response.data.forEach(function(friend_data) {
                        friend_app_ids[friend_data.name] = friend_data.id.toString();
                    });
                    // console.log(friend_app_ids);
                    // get list of taggable fb friends
                    FB.api("/me/taggable_friends?limit=5000",function (response) {
                        if (response && !response.error) {
                            response.data.forEach(function(friend_data) {
                                friend = {
                                    'name':friend_data.name,
                                    'id':friend_data.id.toString()
                                };
                                // if the a taggable friend uses 3gt, store the user id
                                if (friend_data.name in friend_app_ids) {
                                    // console.log(friend_app_ids[friend_data.name]);
                                    friend.app_id = friend_app_ids[friend_data.name];
                                    // console.log(friend);
                                }
                                friend_ids.push(friend);
                            });
                            
                            localStorage['friend_ids'] = JSON.stringify(friend_ids);
                            // console.log(localStorage['friend_ids']);
                        } else {
                            console.log(response.error)
                        }
                    });
                } else {
                    console.log(response.error)
                }
            });
        }else{
            FB.login();
        }
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
