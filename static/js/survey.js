
$(document).ready(function(){

    $.validator.messages.required = "";
    $('#demographic-form').validate({
        invalidHandler: function(event, validator) {
            var errors = validator.numberOfInvalids();
            if (errors) {
                var message = errors == 1
                ? 'You missed 1 field.'
                : 'You missed ' + errors + ' fields.';
                $("div.d-error span").html(message);
                $("div.d-error").show();
            } else {
                $("div.d-error").hide();
            }
        },

        highlight: function(element, errorClass){
            $(element).addClass('validation-error');
            if($(element).siblings('.error-msg').length == 0){
                if($(element).attr('id') == 'survey-age'){
                    $('<label class="error-msg">This field is required.</label>').insertAfter(element);
                }else{
                    $('<label class="error-msg">This field is required.</label>').insertAfter($(element).prev().prev());
                }
            }
        },
        unhighlight: function(element, errorClass){
            $(element).removeClass('validation-error');
            $(element).siblings('.error-msg').remove();
        }
    });

    $('#ipip-form').validate({
        invalidHandler: function(event, validator) {
            var errors = validator.numberOfInvalids();
            if (errors) {
                var message = errors == 1
                ? 'You missed 1 field.'
                : 'You missed ' + errors + ' fields.';
                $("div.ipip-error span").html(message);
                $("div.ipip-error").show();
            } else {
                $("div.ipip-error").hide();
            }
        },

        highlight: function(element, errorClass){
            $(element).addClass('validation-error');
            if($(element).parent().parent().siblings('.error-msg').length == 0){
                // if($(element).attr('id') == 'survey-age'){
                //     $('<label class="error-msg">This field is required.</label>').insertAfter(element);
                // }else{
                $('<label class="error-msg">This field is required.</label>').insertBefore($(element).parent().parent().prev());
                // }
            }
        },
        unhighlight: function(element, errorClass){
            $(element).removeClass('validation-error');
            $(element).parent().parent().siblings('.error-msg').remove();
        }
    });

    $('#cesd-form').validate({
        invalidHandler: function(event, validator) {
            var errors = validator.numberOfInvalids();
            if (errors) {
                var message = errors == 1
                ? 'You missed 1 field.'
                : 'You missed ' + errors + ' fields.';
                $("div.cesd-error span").html(message);
                $("div.cesd-error").show();
            } else {
                $("div.cesd-error").hide();
            }
        },

        highlight: function(element, errorClass){
            $(element).addClass('validation-error');
            if($(element).parent().parent().siblings('.error-msg').length == 0){
                // if($(element).attr('id') == 'survey-age'){
                //     $('<label class="error-msg">This field is required.</label>').insertAfter(element);
                // }else{
                $('<label class="error-msg">This field is required.</label>').insertBefore($(element).parent().parent().prev());
                // }
            }
        },
        unhighlight: function(element, errorClass){
            $(element).removeClass('validation-error');
            $(element).parent().parent().siblings('.error-msg').remove();
        }
    });
    
    $('#perma-form').validate({
        invalidHandler: function(event, validator) {
            var errors = validator.numberOfInvalids();
            if (errors) {
                var message = errors == 1
                ? 'You missed 1 field.'
                : 'You missed ' + errors + ' fields.';
                $("div.perma-error span").html(message);
                $("div.perma-error").show();
            } else {
                $("div.perma-error").hide();
            }
        },

        highlight: function(element, errorClass){
            $(element).addClass('validation-error');
            if($(element).parent().parent().siblings('.error-msg').length == 0){
                // if($(element).attr('id') == 'survey-age'){
                //     $('<label class="error-msg">This field is required.</label>').insertAfter(element);
                // }else{
                $('<label class="error-msg">This field is required.</label><br/>').insertBefore($(element).parent().parent().prev());
                // }
            }
        },
        unhighlight: function(element, errorClass){
            $(element).removeClass('validation-error');
            $(element).parent().parent().siblings('.error-msg').remove();
        }
    });

    $("#to-survey1").click(function(){
        // result = false;
        //validate demographic
        if ($('#demographic-form').valid()){
            $("div.d-error").hide();
            submit_demographic(); 
        }
        else{
            return false;   
        }
    });

    $("#to-survey2").click(function(){
        if ($('#ipip-form').valid()){
            $("div.ipip-error").hide();
            submit_ipip();  
        }else{
            return false;            
        }

          
    });

    $("#to-survey3").click(function(){
        if ($('#cesd-form').valid()){
            $("div.cesd-error").hide();
            submit_cesd(); 
        }else{
            return false;            
        }   
    }); 

    $("#submit-survey").click(function(){
        if ($('#perma-form').valid()){
            $("div.perma-error").hide();
            submit_perma(); 
        }else{
            return false;            
        }         
    });

});


function submit_demographic(){
    survey_id = Cookies.get("survey_id");
    var data_in = $("form#demographic-form").serialize() + "&type=1&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(){
        $('#collapseOne').collapse('show'); 
    });
    return false;
}

function submit_ipip(){
    survey_id = Cookies.get("survey_id");
    var data_in = $("form#ipip-form").serialize() + "&type=2&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(){
        $('#collapseOne').collapse('hide');
        $('#collapseTwo').collapse('show');  
    });
    return false;
}

function submit_cesd(){
    survey_id = Cookies.get("survey_id");
    var data_in = $("form#cesd-form").serialize() + "&type=3&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(){
        $('#collapseTwo').collapse('hide');
        $('#collapseThree').collapse('show');  
    });
    return false;
}

function submit_perma(){
    survey_id = Cookies.get("survey_id");
    var data_in = $("form#perma-form").serialize() + "&type=4&survey_id=" + survey_id;
    alert(data_in);
    $.post("/survey", data_in).done(function(){
      window.location = "http://tgt-dev.appspot.com/landing";   
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
// $(document).on("click","#submit",function(e) {
//     var data_in = $( "form#user_form" ).serialize();
//     // alert(data_in);
//     $.post( "/admin",data_in)
//         .done(function(){
//             window.location = "http://tgt-dev.appspot.com/";
//         });
//     return false;
// });

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
