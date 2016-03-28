
$(document).ready(function(){

    $(document).tooltip({show: null});
    if ($('#resubmit-email-modal').attr('data-resubmit') == 'True'){
        $('#resubmit-email-modal').modal('show');
    }
    // survey_id = Cookies.get("survey_id");
    // if(survey_id == null || survey_id == "")
    //     $('#resubmit-email-modal').modal('show');

    $('#resubmit-email-form').validate();
    $('#resubmit-email-btn').click(function(){
        if ($('#resubmit-email-form').valid()){
            resubmit_survey_id();
            $('#resubmit-email-modal').modal('hide');
        }
    });

    

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
                $('html,body').animate({scrollTop: $("div.ipip-error").offset().top-70}, 500); 
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
                $('html,body').animate({scrollTop: $("div.cesd-error").offset().top-70}, 500); 
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
                $('html,body').animate({scrollTop: $("div.perma-error").offset().top-70}, 500); 
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


    $('#accordion').on('shown.bs.collapse', function (e) {
        var offset = $(this).find('.collapse.in').prev('.panel-heading');
        if(offset) {
            $('html,body').animate({scrollTop: $(offset).offset().top-20}, 500); 
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
        if ($('#perma-form').valid()){
            $("div.perma-error").hide();
            submit_perma(); 
        }else{
            return false;            
        }   
    }); 

    $("#submit-survey").click(function(){
        if ($('#cesd-form').valid()){
            $("div.cesd-error").hide();
            submit_cesd(); 
        }else{
            return false;            
        }         
    });

    $("#finish-survey").click(function(){
        var results = new RegExp('[\?&]' + 'survey_no' + '=([^&#]*)').exec(window.location.href);
    var survey_no = results[1];
        var data_in = $("form#cesd-form").serialize() + "&survey_no=" + survey_no + "&type=4&survey_id=" + survey_id;
        console.log(data_in);
        $.post("/survey", data_in).done(function(){
            window.location = "http://tgt-dev.appspot.com/";  
        });
    })

});


function resubmit_survey_id(){

    // alert('not valid!');
    var data_in = "type=0&email=" + $('#resubmit-email-field').val();

    // alert(data_in);
    $.post("/survey", data_in).done(function(data){
       // Cookies.set('liame', $('#email-field').val(), {expires:1});
       $('#resubmit-email-field').val('');
       // alert('survey_id=' + data.survey_id);
       Cookies.set('survey_id', data.survey_id, {expires:365});
       Cookies.set('survey_no', data.survey_no, {expires:365});
    });
}

function submit_demographic(){
    survey_id = Cookies.get("survey_id");
    
    var data_in = $("form#demographic-form").serialize() + "&survey_no=0&type=1&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(){
        $('#collapseOne').collapse('show'); 
    });
    return false;
}

function submit_ipip(){
    survey_id = Cookies.get("survey_id");
    var data_in = $("form#ipip-form").serialize() + "&survey_no=0&type=2&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(){
        $('#collapseOne').collapse('hide');
        $('#collapseTwo').collapse('show');  
    });
    return false;
}

function submit_perma(){
    survey_id = Cookies.get("survey_id");
    var results = new RegExp('[\?&]' + 'survey_no' + '=([^&#]*)').exec(window.location.href);
    var survey_no = results[1];

    var data_in = $("form#perma-form").serialize() + "&survey_no=" + survey_no + "&type=3&survey_id=" + survey_id;
    console.log(data_in);
    $.post("/survey", data_in).done(function(data){
        if(survey_no != 0)
            Cookies.set('survey_id', data.survey_id, {expires:365}); 
            Cookies.set('survey_no', data.survey_no, {expires:365});
        $('#collapseTwo').collapse('hide');
        $('#collapseThree').collapse('show'); 
    });
    return false;
}

function submit_cesd(){
    survey_id = Cookies.get("survey_id");
    var results = new RegExp('[\?&]' + 'survey_no' + '=([^&#]*)').exec(window.location.href);
    var survey_no = results[1];

    var cesd_score = 0;
    var cesd_count = 1;
    
    $("input:radio[name*='CESD']:checked").each(function(){
        if (cesd_count % 4 == 0 && cesd_count != 20){
            cesd_score += (3 - parseInt($(this).val()));
        }else{
            cesd_score += parseInt($(this).val());
        }
        cesd_count++;
    });
    // alert(cesd_score);
    if (cesd_score >= 7 && cesd_score < 16){
        $('#cesd-score-7').css('display', 'block');
        $('#finish-survey').css('display', 'block');
        $('#submit-survey').css('display', 'none');
    }else if (cesd_score >= 16  && cesd_score < 21){
        $('#cesd-score-16').css('display', 'block');
        $('#finish-survey').css('display', 'block');
        $('#submit-survey').css('display', 'none');
    }else if (cesd_score >= 21  && cesd_score < 41){
        $('#cesd-score-21').css('display', 'block');
        $('#finish-survey').css('display', 'block');
        $('#submit-survey').css('display', 'none');
    }else if (cesd_score >= 41){
        $('#cesd-score-41').css('display', 'block');
        $('#finish-survey').css('display', 'block');
        $('#submit-survey').css('display', 'none');
    }else{
        var data_in = $("form#cesd-form").serialize() + "&survey_no=" + survey_no + "&type=4&survey_id=" + survey_id;
        console.log(data_in);
        $.post("/survey", data_in).done(function(){
            window.location = "http://tgt-dev.appspot.com/";  
        });
    }
    
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
// $('#fblogin-modal').on('hidden.bs.modal', function () {
//   FB.login();
// })

function logout() {
    FB.logout(function(response) {
        if (response && !response.error) {
            window.location = "http://tgt-dev.appspot.com/logout";
        } else {
            console.log(response.error)
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
        logout();
    });

    FB.getLoginStatus(function(response){
        if(response.status !== 'connected'){
            // alert('not login');
            var results = new RegExp('[\?&]' + 'survey_no' + '=([^&#]*)').exec(window.location.href);
            var survey_no = results[1];

            if(survey_no != 0){
                $('#fblogin-modal').modal('show');            
            }

        }else{
            $('#fblogin-modal').modal('hide'); 
        }
        // FB.api("/me/friends", function (response) {
        //     if (response && !response.error) {
        //         assign_user(response.data);
        //     }
        // });
    });
};

// Load the SDK Asynchronously
(function(d){
    var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
    js = d.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    d.getElementsByTagName('head')[0].appendChild(js);
}(document));


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
