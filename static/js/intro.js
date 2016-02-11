
$(document).ready(function(){


    $('#email-form').validate();
    
    $('[data-toggle="tooltip"]').tooltip(); 
    // $.validate();

    $("#no-btn").click(function() {
        $('#exit-modal').modal('show');
    });

    $("#yes-btn").click(function() {
        $('#enroll-form').css('display', 'none');
        $('#email-form').css('display','block');    
    });

    $("#exit-btn").click(function() {
        window.open('','_self').close();
    });

    $('#email-btn').click(function() {

        if (!$('#email-form').valid()){
            // alert('not valid!');
            return false;
        }

    submit_email();
        
        
        
    });

});

function submit_email(){
    var data_in = "type=0&email=" + $('#email-field').val();
        
    alert(data_in);
    $.post("/survey", data_in).done(function(data){
       // Cookies.set('liame', $('#email-field').val(), {expires:1});
       $('#email-field').val('');
       alert('survey_id=' + data.survey_id);
       Cookies.set('survey_id', data.survey_id, {expires:365});
       window.location = "http://tgt-dev.appspot.com/survey";
    });
    return false;
    }


// choose public or private user
// $(document).on("click","#submit_public_user",function(e) {
//     var data_in = $( "form#public_user" ).serialize();
//     console.log(data_in);
//     $.post( "/intro",data_in)
//         .done(function(){
//             window.location = "http://tgt-dev.appspot.com/";
//         });
//     return false;
// });

// assign public or private user
// function assign_user(friend_list) {
//     $(document).on("click","#assign_public_user",function(e) {
//         if (friend_list.length > 0 ) {
//             data_in = 'public_user=public';
//         } else {
//             data_in = 'public_user=assign';
//         }
//         $.post( "/intro",data_in)
//             .done(function(){
//                 window.location = "http://tgt-dev.appspot.com/";
//             });
//         return false;
//     });
// }

// function get_settings() {
//     $.get( "/settings",'')
//         .done(function(data) {
//             $('input#settings_wall').prop('checked', data.default_fb);
//             $('input#settings_public').prop('checked', data.default_public);
//             $('input#reminder_days').val(data.reminder_days);
//         });
//     return false;
// }

// function get_notifications(notification_list) {
//     $.get('static/templates/good_thing_tpl.html', function(templates) {
//         notification_list.forEach(function(data) {
//             var template;
//             if (data.event_type === 'comment') {
//                 template = $(templates).filter('#comment_notification_tpl').html();
//             } else if (data.event_type === 'cheer') {
//                 template = $(templates).filter('#cheer_notification_tpl').html();
//             } else if (data.event_type === 'mention') {
//                 template = $(templates).filter('#mention_notification_tpl').html();
//             }
//             $('ul#notifications').prepend(Mustache.render(template, data));
//         });
//     });
// }

// function logout() {
//     FB.logout(function(response) {
//         if (response && !response.error) {
//             window.location = "http://tgt-dev.appspot.com/logout";
//         } else {
//             console.log(response.error)
//         }
//     });
// }

// window.fbAsyncInit = function() {
//     FB.init({
//         appId      : "997456320282204", // App ID
//         version: 'v2.0',
//         status     : true, // check login status
//         cookie     : true, // enable cookies to allow the server to access the session
//         xfbml      : true  // parse XFBML
//     });

//     // logout handler
//     $(document).on("click","a#logout",function(e) {
//         logout()
//     });

//     FB.getLoginStatus(function(response){
//         FB.api("/me/friends", function (response) {
//             if (response && !response.error) {
//                 assign_user(response.data);
//             }
//         });
//     });
// };

// // Load the SDK Asynchronously
// (function(d){
//     var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
//     js = d.createElement('script'); js.id = id; js.async = true;
//     js.src = "//connect.facebook.net/en_US/sdk.js";
//     d.getElementsByTagName('head')[0].appendChild(js);
// }(document));


// use admin page to change user type
$(document).on("click","#submit",function(e) {
    var data_in = $( "form#user_form" ).serialize();
    // alert(data_in);
    $.post( "/admin",data_in)
        .done(function(){
            window.location = "http://tgt-dev.appspot.com/";
        });
    return false;
});

/************* for survey ****************/



// $(document).on("click","#to-survey1", function(e){
//     //form validation
//     $('#collapseOne').collapse('show');
//     //submit to survey
// });

// $(document).on("click","#to-survey2", function(e){
//     //form validation
//     //clse and disable survey 1
//     $('#collapseOne').collapse('hide');
//     $('#collapseTwo').collapse('show');
// });

// $(document).on("click","#to-survey3", function(e){
//     //form validation
//     //clse and disable survey 1
//     $('#collapseTwo').collapse('hide');
//     $('#collapseThree').collapse('show');
// });
