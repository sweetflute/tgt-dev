import facebook
import webapp2
import os
import jinja2
import urllib2
import models
import app_config
import json
import datetime
import logging
import quopri
import random
import math
import string

from google.appengine.ext import db
from webapp2_extras import sessions
from google.appengine.api import mail
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import blobstore
# from google.appengine.ext import ndb
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.api import search

FACEBOOK_APP_ID = app_config.FACEBOOK_APP_ID
FACEBOOK_APP_SECRET = app_config.FACEBOOK_APP_SECRET

# base handler that always checks to make sure the user is signed in and caches
# user information
# TODO: handle session expire - ask user to login again
class BaseHandler(webapp2.RequestHandler):
    """Provides access to the active Facebook user in self.current_user
    The property is lazy-loaded on first access, using the cookie saved
    by the Facebook JavaScript SDK to determine the user ID of the active
    user. See http://developers.facebook.com/docs/authentication/ for
    more information.
    """
    @property
    def current_user(self):
        if self.session.get("user"):
            # model.User is logged in
            return self.session.get("user")
        else:
            # Either used just logged in or just saw the first page
            # We'll see here
            cookie = facebook.get_user_from_cookie(self.request.cookies,
                                                   FACEBOOK_APP_ID,
                                                   FACEBOOK_APP_SECRET)
            if cookie:
                # Okay so user logged in.
                # Now, check to see if existing user

                user = models.User.get_by_key_name(cookie["uid"])
                graph = facebook.GraphAPI(cookie["access_token"])

                if not user:
                    # Not an existing user so get user info
                    profile = graph.get_object("me")
                    settings = models.Settings()
                    settings.put()
                    word_cloud = models.WordCloud()
                    word_cloud.put()
                    user = models.User(
                        key_name=str(profile["id"]),
                        id=str(profile["id"]),
                        name=profile["name"],
                        profile_url=profile["link"],
                        access_token=cookie["access_token"],
                        settings=settings,
                        word_cloud=word_cloud
                    )
                    user.put()
                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]
                    user.put()
                # User is now logged in
                self.session["user"] = {
                    'name':user.name,
                    'profile_url':user.profile_url,
                    'id':user.id,
                    'access_token':user.access_token,
                    # 'public_user':user.public_user,
                    'public_user':user.user_type,
                    'friends_list':graph.get_connections("me", "friends")
                }
                return self.session.get("user")
        return None

    def dispatch(self):
        """
        This snippet of code is taken from the webapp2 framework documentation.
        See more at
        http://webapp-improved.appspot.com/api/webapp2_extras/sessions.html
        """
        self.session_store = sessions.get_store(request=self.request)
        try:
            webapp2.RequestHandler.dispatch(self)
        finally:
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        """
        This snippet of code is taken from the webapp2 framework documentation.
        See more at
        http://webapp-improved.appspot.com/api/webapp2_extras/sessions.html
        """
        return self.session_store.get_session()

    # creates a notification any time the current user cheers, comments, or
    # mentions
    # TODO: don't create notifications for current user
    def notify(self,event_type,to_user,event_id):
        from_user_id = str(self.current_user['id'])
        from_user = models.User.get_by_key_name(from_user_id)
        if from_user != to_user:
            notification = models.Notification(
                from_user=from_user,
                to_user=to_user,
                event_type=event_type,
                event_id=str(event_id),
            )
            notification.put()
        return from_user != to_user

# handler for home pages
class HomeHandler(BaseHandler):
    # check if user if user is logged in and public/private
    # serve landing page, public home page, or private home page
    def get(self):
        current_user = self.current_user
        
        if current_user:
            survey_no = -1
            user_id = str(self.current_user['id'])
            user = models.User.get_by_key_name(user_id)
            # user_type = self.request.get('user_type')
            # check if user already get a type assigned

            # check if user already fillied in survey
            has_init_survey = False
            if user.survey_id == None or user.survey_id == "":
                # if "survey_id" in 
                logging.info(self.request.cookies)
                if "survey_id" in self.request.cookies:
                    survey_id = self.request.cookies['survey_id']
                else:
                    survey_id = None
                
                if survey_id != None and survey_id != "":
                    user.survey_id = survey_id
                    survey = models.Survey.get_by_key_name(survey_id)
                    if survey != None and survey.CESD_20 != None:
                        user.email = survey.email
                        user.put()
                        has_init_survey = True
                    else:
                        has_init_survey = False
                else:                    
                    has_init_survey = False
            else:
                has_init_survey = True

            if (has_init_survey):
                user_type = self.request.cookies.get('user_type')
                logging.info("user_type in cookies:")
                logging.info(user_type)
                logging.info("user.user_type=" + str(user.user_type))


                if user.user_type == -1:
                    if (user_type != "" and user_type != None):
                        user.user_type = int(user_type)
                    else:
                        user.user_type = int(math.floor(random.random()*3))
                    user.put()
                if user.user_type != user_type:
                    self.response.set_cookie('user_type', str(user.user_type), max_age=360)


                #Check if any survey due:
                date_since_enroll = (datetime.datetime.now() - user.created).days
                logging.info("date_since_enroll=" + str(date_since_enroll))

                if(date_since_enroll < 30 and date_since_enroll >= 7 and user.survey_1_id is None):
                    survey_no = 1
                elif(date_since_enroll < 90 and date_since_enroll >= 30 and user.survey_2_id is None):
                    survey_no = 2
                elif(date_since_enroll < 180 and date_since_enroll >= 90 and user.survey_3_id is None):
                    survey_no = 3
                elif(date_since_enroll >= 180 and user.survey_4_id is None):
                    survey_no = 4



                # if user.public_user:
                if user.user_type == 2:
                    template = jinja_environment.get_template('public_main.html')
                # elif user.public_user is private user:
                elif user.user_type == 1:
                    template = jinja_environment.get_template('private_main.html')
                # elif user.public_user is placebo:
                elif user.user_type == 0:
                    template = jinja_environment.get_template('memory_main.html')
                # else:
                #     template = jinja_environment.get_template('landing.html')
                    # return None
                template_values = {
                    'facebook_app_id':FACEBOOK_APP_ID,
                    'current_user':current_user,
                    'survey_no':survey_no
                }
            else:
                survey_no = 0
                template = jinja_environment.get_template('survey.html')
                template_values = {'resubmit':'True', 'survey_no':survey_no}
                # template = jinja_environment.get_template('intro.html')
                # template_values = {'resubmit':'True'}
            logging.info("survey_no=" + str(survey_no))
            self.response.out.write(template.render(template_values))
        else:
            if ('user_type' not in self.request.cookies and 'survey_id' not in self.request.cookies):
                self.redirect('/intro')

            else:
                if ('user_type' not in self.request.cookies):
                    user_type = int(math.floor(random.random()*3))
                    self.response.set_cookie('user_type', str(user_type), max_age=360)
                else:
                    user_type = int(self.request.cookies['user_type'])
                # if(int(user_type) == -1):
                #     user_type = int(math.floor(random.random()*3))
                #     self.response.set_cookie('user_type', str(user_type), max_age=360)
            
                logging.info("In Home Handler, not current user, user_type=" + str(user_type))
                template = jinja_environment.get_template('landing.html')
                template_values = {
                'public_user': user_type,
                }
                logging.info(template_values)
                self.response.out.write(template.render(template_values))

# intro page for first time users
class IntroHandler(BaseHandler):
    # serve the intro page
    def get(self):
        current_user = self.current_user
        logging.info("IntroHandler")
        # logging.info(self.request.cookies)
        # logging.info("survey_id" in self.request.cookies)

        if(current_user or "survey_id" in self.request.cookies):
            self.redirect('/')
        else:
            template = jinja_environment.get_template('intro.html')
            template_values = {
            #         'facebook_app_id':FACEBOOK_APP_ID,
            #         'current_user':current_user,
            }
            self.response.out.write(template.render(template_values))

    # update the public/private field after the user has passed through the intro
    # screen.
class LandingHandler(BaseHandler):
    def get(self):
        # public_user = self.request.get('public_user') 
        user_type = int(math.floor(random.random()*3))
        current_user = self.current_user
        if current_user:
            user_id = str(self.current_user['id'])
            user = models.User.get_by_key_name(user_id)
            if user.user_type == -1:
                user.user_type = user_type
                user.put()
        template_values = {
            'public_user':user_type,
        }
 
        logging.info("public_user=" + str(user_type))
        template = jinja_environment.get_template('landing.html')
        self.response.set_cookie('user_type', str(user_type), max_age=365)
        self.response.out.write(template.render(template_values))

class SurveyHandler(BaseHandler):
    def get(self):
        template_values = {'resubmit':'False'}
        survey_no = int(self.request.get('survey_no'))

        if(survey_no == 0):
            logging.info("survey page 0")
            template = jinja_environment.get_template('survey.html')
        else:
            logging.info("survey page " + str(survey_no))
            template = jinja_environment.get_template('survey_followup.html')
        self.response.out.write(template.render(template_values))
    def post(self):
        survey_type = self.request.get('type')
        logging.info("survey_type=" + survey_type)
        survey_no = int(self.request.get('survey_no'))

        # submit email
        if(survey_type == '0'):
            email = self.request.get('email')
            if (email != None and email != ''):
                survey_id = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                survey_id += ''.join([random.choice(string.ascii_letters + string.digits) for n in xrange(6)])
                logging.info("survey_id:" + survey_id)
                # survey = models.Survey.get_by_key_name(survey_id)
                survey = models.Survey(
                            key_name=survey_id,
                            email=email,
                            survey_no=0
                            )
                survey.put()

                result = {"survey_id":survey_id, "survey_no":survey_no}
                # template = jinja_environment.get_template('intro.html')
                # self.response.out.write(template.render(template_values))
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(json.dumps(result))
       # submit demographic
        elif (survey_type == '1'):
            logging.info("survey_type=1")
            survey_id = self.request.get('survey_id')
            survey = models.Survey.get_by_key_name(survey_id)
            logging.info("survey_id=" + survey_id)

            survey.age = self.request.get('survey-age')
            survey.gender = self.request.get('survey-gender')
            logging.info("age=" + survey.age)
            logging.info("gender=" + survey.gender)
            survey.put()


        # submit ipip
        elif (survey_type == '2'):
            survey_id = self.request.get('survey_id')
            survey = models.Survey.get_by_key_name(survey_id)

            survey.IPIP_1 = self.request.get('IPIP-1')
            survey.IPIP_2 = self.request.get('IPIP-2')
            survey.IPIP_3 = self.request.get('IPIP-3')
            survey.IPIP_4 = self.request.get('IPIP-4')
            survey.IPIP_5 = self.request.get('IPIP-5')
            survey.IPIP_6 = self.request.get('IPIP-6')
            survey.IPIP_7 = self.request.get('IPIP-7')
            survey.IPIP_8 = self.request.get('IPIP-8')
            survey.IPIP_9 = self.request.get('IPIP-9')
            survey.IPIP_10 = self.request.get('IPIP-10')
            survey.IPIP_11 = self.request.get('IPIP-11')
            survey.IPIP_12 = self.request.get('IPIP-12')
            survey.IPIP_13 = self.request.get('IPIP-13')
            survey.IPIP_14 = self.request.get('IPIP-14')
            survey.IPIP_15 = self.request.get('IPIP-15')
            survey.IPIP_16 = self.request.get('IPIP-16')
            survey.IPIP_17 = self.request.get('IPIP-17')
            survey.IPIP_18 = self.request.get('IPIP-18')
            survey.IPIP_19 = self.request.get('IPIP-19')
            survey.IPIP_20 = self.request.get('IPIP-20')
            
            survey.put()
            
        # submit perma
        elif (survey_type == '3'):
            survey_no = int(self.request.get('survey_no'))

            if(survey_no is not 0):
                survey_id = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                survey_id += ''.join([random.choice(string.ascii_letters + string.digits) for n in xrange(6)])
                logging.info("survey_id:" + survey_id)
                # survey = models.Survey.get_by_key_name(survey_id)
                survey = models.Survey(
                            key_name=survey_id,
                            survey_no=survey_no
                            )
                survey.put()

                result = {"survey_id":survey_id, "survey_no":survey_no}
                self.response.headers['Content-Type'] = 'application/json'
                self.response.out.write(json.dumps(result))
            else:
                survey_id = self.request.get('survey_id')
                survey = models.Survey.get_by_key_name(survey_id)
 

            survey.PERMA_1 = self.request.get('PERMA-1')
            survey.PERMA_2 = self.request.get('PERMA-2')
            survey.PERMA_3 = self.request.get('PERMA-3')
            survey.PERMA_4 = self.request.get('PERMA-4')
            survey.PERMA_5 = self.request.get('PERMA-5')
            survey.PERMA_6 = self.request.get('PERMA-6')
            survey.PERMA_7 = self.request.get('PERMA-7')
            survey.PERMA_8 = self.request.get('PERMA-8')
            survey.PERMA_9 = self.request.get('PERMA-9')
            survey.PERMA_10 = self.request.get('PERMA-10')
            survey.PERMA_11 = self.request.get('PERMA-11')
            survey.PERMA_12 = self.request.get('PERMA-12')
            survey.PERMA_13 = self.request.get('PERMA-13')
            survey.PERMA_14 = self.request.get('PERMA-14')
            survey.PERMA_15 = self.request.get('PERMA-15')
            survey.PERMA_16 = self.request.get('PERMA-16')
            survey.PERMA_17 = self.request.get('PERMA-17')
            survey.PERMA_18 = self.request.get('PERMA-18')
            survey.PERMA_19 = self.request.get('PERMA-19')
            survey.PERMA_20 = self.request.get('PERMA-20')
            survey.PERMA_21 = self.request.get('PERMA-21')
            survey.PERMA_22 = self.request.get('PERMA-22')
            survey.PERMA_23 = self.request.get('PERMA-23')
            
            survey.put()

        #submit cesd
        elif (survey_type == '4'):
            survey_id = self.request.get('survey_id')
            survey = models.Survey.get_by_key_name(survey_id)

            survey.CESD_1 = self.request.get('CESD-1')
            survey.CESD_2 = self.request.get('CESD-2')
            survey.CESD_3 = self.request.get('CESD-3')
            survey.CESD_4 = self.request.get('CESD-4')
            survey.CESD_5 = self.request.get('CESD-5')
            survey.CESD_6 = self.request.get('CESD-6')
            survey.CESD_7 = self.request.get('CESD-7')
            survey.CESD_8 = self.request.get('CESD-8')
            survey.CESD_9 = self.request.get('CESD-9')
            survey.CESD_10 = self.request.get('CESD-10')
            survey.CESD_11 = self.request.get('CESD-11')
            survey.CESD_12 = self.request.get('CESD-12')
            survey.CESD_13 = self.request.get('CESD-13')
            survey.CESD_14 = self.request.get('CESD-14')
            survey.CESD_15 = self.request.get('CESD-15')
            survey.CESD_16 = self.request.get('CESD-16')
            survey.CESD_17 = self.request.get('CESD-17')
            survey.CESD_18 = self.request.get('CESD-18')
            survey.CESD_19 = self.request.get('CESD-19')
            survey.CESD_20 = self.request.get('CESD-20')
            
            survey.put()

            user_id = str(self.current_user['id'])
            user = models.User.get_by_key_name(user_id)
            survey_no = int(self.request.get('survey_no'))

            if (survey_no == 1):
                user.survey_1_id = survey_id
            elif (survey_no == 2):
                user.survey_2_id = survey_id
            elif (survey_no == 3):
                user.survey_3_id = survey_id
            elif (survey_no == 4):
                user.survey_4_id = survey_id
            user.put()           



class PostHandler(blobstore_handlers.BlobstoreUploadHandler, BaseHandler):
    def post(self):
        user_id = str(self.current_user['id'])
        view = self.request.get('view')
        cursor_str = self.request.get('cursor')
        logging.info("good_things_cursor=" + cursor_str)
        if(cursor_str != ""):
            good_things_cursor = Cursor.from_websafe_string(cursor_str.encode('utf-8'))
        else:
            good_things_cursor = None

        # tz_offset = self.request.get('tzoffset')
        # if the client isn't saving a post
        upload_url = blobstore.create_upload_url('/post')
        logging.info("in the post, view=" + view)
        if view != '':
            all_good_things = models.GoodThing.all().order('-created').filter('deleted =',False)
            # if (good_things_cursor == ""):
            #     good_things_cursor = None
            # select only this week's post
            # a_week_ago = (datetime.datetime.now() - datetime.timedelta(days = 7)).date()
            # good_things = models.GoodThing.all().order('created').filter('created >=', a_week_ago).filter('deleted =',False)
            
            user = models.User.get_by_key_name(user_id)
            # if (user.public_user == False):

            if view == 'search':
                good_things = all_good_things.filter('user =',user).filter('memory =',False).fetch(limit=10, start_cursor=good_things_cursor)
            else:
                if (user.user_type != 2):
                    if(user.user_type == 0):
                        #placebo user
                        good_things = all_good_things.filter('user =',user).filter('memory =',True).fetch(limit=10, start_cursor=good_things_cursor)
                        logging.info("placebo user")
                    else:
                        #private user
                        good_things = all_good_things.filter('user =',user).filter('memory =',False).fetch(limit=10, start_cursor=good_things_cursor)
                        logging.info("private user")
                    good_things_cursor = all_good_things.cursor()
                    result = [x.template(user_id,good_things_cursor, upload_url) for x in good_things]#[::-1]
                    # logging.info(upload_url)
                    logging.info(result)
                else: 
                    #public user
                    # return just the current user's posts
                    if view == 'me':
                        user = models.User.get_by_key_name(user_id)
                        # good_things.filter('user =',user)
                        good_things = all_good_things.filter('user =',user).filter('memory =',False).fetch(limit=10, start_cursor=good_things_cursor)
                        good_things_cursor = all_good_things.cursor()
                        result = [x.template(user_id,good_things_cursor,upload_url) for x in good_things]#[::-1]
                        logging.info("view == me")
                        # logging.info(result)
                    # return all public posts and current user's private posts
                    elif view == 'all':
                        user = models.User.get_by_key_name(user_id)
                        good_things = all_good_things.filter('memory =',False).fetch(limit=10, start_cursor=good_things_cursor)
                        good_things_cursor = all_good_things.cursor()
                        result = [x.template(user_id,good_things_cursor, upload_url) for x in good_things if (x.public or x.user.id == user.id)]#[::-1]
                        logging.info("view == all")
                        # logging.info(result)
                    elif view == 'profile':
                        profile_user_id = str(self.request.get('userid'))
                        if (profile_user_id == user_id):
                            user = models.User.get_by_key_name(user_id)
                            # good_things.filter('user =',user)
                            good_things = all_good_things.filter('memory =',False).filter('user =',user).fetch(limit=10, start_cursor=good_things_cursor)
                            good_things_cursor = all_good_things.cursor()
                            result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
                            logging.info("view == profile_me")
                        else:
                            user = models.User.get_by_key_name(profile_user_id)
                            # good_things.filter('user =',user)
                            good_things = all_good_things.filter('memory =',False).filter('user =',user).filter('public =',True).fetch(limit=10, start_cursor=good_things_cursor)
                            good_things_cursor = all_good_things.cursor()
                            result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
                            logging.info("view == profile_others")
                    else:
                        profile_user_id = str(self.request.get('view'))
                        profile_user = models.User.get_by_key_name(profile_user_id)
                        # good_things.filter('user =',profile_user).filter('public =',True)
                        good_things = all_good_things.filter('user =',profile_user).filter('public =',True).filter('memory =',False).fetch(limit=10, start_cursor=good_things_cursor)
                        good_things_cursor = all_good_things.cursor()
                        result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
                        logging.info("view == else")
                        # logging.info(result)
            # logging.info("result=" + str(result))
            if (len(result) == 0):
                result = [{'upload_url': upload_url, 'cursor': good_things_cursor}]
                # logging.info("no post: upload_url=" + str(result
        # save a post.  separate this into the post() method
        else:
            # logging.info("save a post")
            result = [self.save_post().template(user_id, good_things_cursor, upload_url)]
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

    # save a post to the datastore and return that post.  this should be turned
    # into the post() method
    def save_post(self):
        logging.info("save_post")
        good_thing_text = self.request.get('good_thing')
        # logging.info(good_thing_text)
        reason = self.request.get('reason')
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        #check if is_memory
        if user.user_type == 0:
            is_memory = True
        else:
            is_memory = False
        logging.info("is_memory=" + str(is_memory))
        tz_offset = self.request.get('tzoffset')
        local_time = datetime.datetime.now() - datetime.timedelta(hours=int(tz_offset))

        upload = self.get_uploads()


        # raw_img = self.request.get('img')
        if len(upload) != 0:
            img_key = upload[0].key()
        else:
            img_key = None
        # if user.public_user:
        if user.user_type == 2:
            if self.request.get('wall') == 'on':
                wall = True
            else:
                wall = False
            if self.request.get('public') == 'on':
                public = True
            else:
                public = False
        else:
            public = False
            wall = False
            mentions = []
        # print wall, self.request.get('wall')
        good_thing = models.GoodThing(
            good_thing=good_thing_text,
            reason=reason,
            created_origin=local_time,
            user=user,
            public=public,
            wall=wall,
            memory=is_memory,
            blob_key = img_key,
        )
        good_thing.put()
        # handle mentions here
        msg_tags=[]
        if self.request.get('mentions') != '':
            # logging.info(self.request.get('mentions'))
            # mention_list = json.loads(str(self.request.get('mentions')))
            mention_list = json.loads(quopri.decodestring(str(self.request.get('mentions'))))
           
            logging.info(mention_list)
            for to_user_id in mention_list:
                if 'app_id' in to_user_id:
                    to_user = models.User.get_by_key_name(str(to_user_id['app_id']))
                    fb_app_id = to_user_id['app_id']
                    event_id = good_thing.key().id()
                    # handle mention notification
                    self.notify(event_type='mention',
                                to_user=to_user,
                                event_id=event_id)
                else:
                    to_user = None
                
                mention = models.Mention(
                    to_user=to_user,
                    good_thing=good_thing,
                    to_fb_user_id = to_user_id['id'],
                    to_user_name = to_user_id['name']
                )
                # print "mention to_user_id:" + str(to_user_id['name'])
                mention.put()
                msg_tags.append(to_user_id['id'].encode('utf-8'))
        # handle posting to fb
        if wall:
            graph = facebook.GraphAPI(self.current_user['access_token'])
            if img_key:
                graph.put_photo(image=raw_img,message=good_thing)
            else:
                # logging.info(msg_tags)
                graph.put_object('me','feed',message=good_thing.good_thing, place='message', tags=msg_tags)


        # print "before return good thing"
        return good_thing

# API for saving and serving posts
# class PostHandler(BaseHandler):
#     # this should be turned into a get() method just for serving posts
#     def post(self):
#         user_id = str(self.current_user['id'])
#         view = self.request.get('view')
#         cursor_str = self.request.get('cursor')
#         # logging.info(cursor_str)
#         if(cursor_str != ""):
#             good_things_cursor = Cursor.from_websafe_string(cursor_str.encode('utf-8'))
#         else:
#             good_things_cursor = None

#         # tz_offset = self.request.get('tzoffset')
#         # if the client isn't saving a post
#         if view != '':
#             all_good_things = models.GoodThing.all().order('-created').filter('deleted =',False)
#             # if (good_things_cursor == ""):
#             #     good_things_cursor = None
#             # select only this week's post
#             # a_week_ago = (datetime.datetime.now() - datetime.timedelta(days = 7)).date()
#             # good_things = models.GoodThing.all().order('created').filter('created >=', a_week_ago).filter('deleted =',False)
            
#             user = models.User.get_by_key_name(user_id)
#             # if (user.public_user == False):
#             if (user.user_type != 2):
#                 good_things = all_good_things.filter('user =',user).fetch(limit=10, start_cursor=good_things_cursor)
#                 good_things_cursor = all_good_things.cursor()
#                 result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
#                 logging.info("private user")
#             else:
#                 # return just the current user's posts
#                 if view == 'me':
#                     user = models.User.get_by_key_name(user_id)
#                     # good_things.filter('user =',user)
#                     good_things = all_good_things.filter('user =',user).fetch(limit=10, start_cursor=good_things_cursor)
#                     good_things_cursor = all_good_things.cursor()
#                     result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
#                     logging.info("view == me")
#                     # logging.info(result)
#                 # return all public posts and current user's private posts
#                 elif view == 'all':
#                     user = models.User.get_by_key_name(user_id)
#                     good_things = all_good_things.fetch(limit=10, start_cursor=good_things_cursor)
#                     good_things_cursor = all_good_things.cursor()
#                     result = [x.template(user_id,good_things_cursor) for x in good_things if (x.public or x.user.id == user.id)]#[::-1]
#                     logging.info("view == all")
#                     # logging.info(result)
#                 elif view == 'profile':
#                     profile_user_id = str(self.request.get('userid'))
#                     if (profile_user_id == user_id):
#                         user = models.User.get_by_key_name(user_id)
#                         # good_things.filter('user =',user)
#                         good_things = all_good_things.filter('user =',user).fetch(limit=10, start_cursor=good_things_cursor)
#                         good_things_cursor = all_good_things.cursor()
#                         result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
#                         logging.info("view == profile_me")
#                     else:
#                         user = models.User.get_by_key_name(profile_user_id)
#                         # good_things.filter('user =',user)
#                         good_things = all_good_things.filter('user =',user).filter('public =',True).fetch(limit=10, start_cursor=good_things_cursor)
#                         good_things_cursor = all_good_things.cursor()
#                         result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
#                         logging.info("view == profile_others")
#                 else:
#                     profile_user_id = str(self.request.get('view'))
#                     profile_user = models.User.get_by_key_name(profile_user_id)
#                     # good_things.filter('user =',profile_user).filter('public =',True)
#                     good_things = all_good_things.filter('user =',profile_user).filter('public =',True).fetch(limit=10, start_cursor=good_things_cursor)
#                     good_things_cursor = all_good_things.cursor()
#                     result = [x.template(user_id,good_things_cursor) for x in good_things]#[::-1]
#                     logging.info("view == else")
#                     # logging.info(result)


#         # save a post.  separate this into the post() method
#         else:
#             result = [self.save_post().template(user_id)]
#         self.response.headers['Content-Type'] = 'application/json'
#         self.response.out.write(json.dumps(result))

#     # save a post to the datastore and return that post.  this should be turned
#     # into the post() method
#     def save_post(self):
#         good_thing_text = self.request.get('good_thing')
#         reason = self.request.get('reason')
#         user_id = str(self.current_user['id'])
#         user = models.User.get_by_key_name(user_id)
#         tz_offset = self.request.get('tzoffset')
#         local_time = datetime.datetime.now() - datetime.timedelta(hours=int(tz_offset))

#         raw_img = self.request.get('img')
#         if raw_img != '':
#             img = db.Blob(raw_img)
#         else:
#             img = None
#         # if user.public_user:
#         if user.user_type == 2:
#             if self.request.get('wall') == 'on':
#                 wall = True
#             else:
#                 wall = False
#             if self.request.get('public') == 'on':
#                 public = True
#             else:
#                 public = False
#         else:
#             public = False
#             wall = False
#             mentions = []
#         # print wall, self.request.get('wall')
#         good_thing = models.GoodThing(
#             good_thing=good_thing_text,
#             reason=reason,
#             created_origin=local_time,
#             user=user,
#             public=public,
#             img=img,
#             wall=wall
#         )
#         good_thing.put()
#         # handle mentions here
#         msg_tags=[]
#         if self.request.get('mentions') != '':
#             mention_list = json.loads(self.request.get('mentions'))
#             # logging.info(mention_list)
#             for to_user_id in mention_list:
#                 if 'app_id' in to_user_id:
#                     to_user = models.User.get_by_key_name(str(to_user_id['app_id']))
#                     fb_app_id = to_user_id['app_id']
#                     event_id = good_thing.key().id()
#                     # handle mention notification
#                     self.notify(event_type='mention',
#                                 to_user=to_user,
#                                 event_id=event_id)
#                 else:
#                     to_user = None
                
#                 mention = models.Mention(
#                     to_user=to_user,
#                     good_thing=good_thing,
#                     to_fb_user_id = to_user_id['id'],
#                     to_user_name = to_user_id['name']
#                 )
#                 mention.put()
#                 msg_tags.append(to_user_id['id'].encode('utf-8'))
#         # handle posting to fb
#         if wall:
#             graph = facebook.GraphAPI(self.current_user['access_token'])
#             if img:
#                 graph.put_photo(image=raw_img,message=good_thing)
#             else:
#                 # logging.info(msg_tags)
#                 graph.put_object('me','feed',message=good_thing.good_thing, place='message', tags=msg_tags)

#         return good_thing

# API for saving and serving cheers
class CheerHandler(BaseHandler):
    def post(self):
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        good_thing_id = long(self.request.get('good_thing'))
        good_thing = models.GoodThing.get_by_id(good_thing_id)
        cheer = good_thing.cheer_set.filter('user =',user).get()
        # if the user has not cheered this post, create a new cheer
        if not cheer:
            cheer = models.Cheer(
                user=user,
                good_thing=good_thing,
            )
            cheer.put()
            cheered = True

            self.notify(event_type='cheer',
                        to_user=good_thing.user,
                        event_id=good_thing_id)
        # if the user has already cheered this post, delete the cheer
        else:
            cheer.delete()
            cheered = False
        self.response.headers['Content-Type'] = 'application/json'
        result = {
            'cheers':good_thing.num_cheers(),
            'cheered':cheered
        }
        self.response.out.write(json.dumps(result))

# API for saving and serving comments.  should be separated like good thing handler
class CommentHandler(BaseHandler):
    def post(self):
        comment_text = self.request.get('comment_text')
        good_thing_id = long(self.request.get('good_thing'))
        good_thing = models.GoodThing.get_by_id(good_thing_id)
        user_id = str(self.current_user['id'])
        # if the client is trying to save a comment, create a new comment, save
        # to the datastore and return the comment
        if comment_text != '':
            user = models.User.get_by_key_name(user_id)
            result = [self.save_comment(comment_text=comment_text,
                                        user=user,
                                        good_thing=good_thing).template(user_id)]
        # return all comments associated with a good thing
        else:
            comments = good_thing.comment_set.order('-created').filter('deleted =',False).fetch(limit=None)
            result = [x.template(user_id) for x in comments]
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

    # save a comment to the datastore
    def save_comment(self, comment_text, user, good_thing):
        comment = models.Comment(
            comment_text=comment_text,
            user=user,
            good_thing=good_thing,
        )
        comment.put()
        event_id = good_thing.key().id()
        self.notify(event_type='comment',
                    to_user=good_thing.user,
                    event_id=event_id,)
        return comment

# API for deleting a good thing or a comment
class DeleteHandler(BaseHandler):
    def post(self):
        obj_id = long(self.request.get('id'))
        if self.request.get('type') == 'good_thing':
            good_thing = models.GoodThing.get_by_id(obj_id)
            good_thing.deleted = True
            good_thing.put()
        elif self.request.get('type') == 'comment':
            comment = models.Comment.get_by_id(obj_id)
            comment.deleted = True
            comment.put()
            result = {'num_comments':comment.good_thing.num_comments()}
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(json.dumps(result))

# log the current user out and redirect to the landing page
class LogoutHandler(BaseHandler):
    def get(self):
        if self.current_user is not None:
            self.session['user'] = None

        self.redirect('/')


# API for updating a user's settings
class SettingsHandler(BaseHandler):
    # update the current user's settings
    def post(self):
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        settings = user.settings
        reminder_days = self.request.get('reminder_days')
        email = self.request.get('email')
        if reminder_days != '' and reminder_days >= 1:
            settings.reminder_days = int(reminder_days)
        else:
            settings.reminder_days = -1
        if self.request.get('default_fb') == 'on':
            settings.default_fb = True
        else:
            settings.default_fb = False
        if self.request.get('default_public') == 'on':
            settings.default_public = True
        else:
            settings.default_public = False

        if email != None and email != '':
            user.email = email
            user.put()
        settings.put()

        result = settings.template()
        result['email'] = str(user.email)
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

    # get the current user's settings
    def get(self):
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        result = user.settings.template()
        result['email'] = user.email
        logging.info(result)
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

# serve the privacy page
class PrivacyHandler(webapp2.RequestHandler):
    def get(self):
        template = jinja_environment.get_template('privacy.html')
        template_values = {}
        self.response.out.write(template.render(template_values))

# API for getting a user's stats (word cloud, good things today).  can be used
# any public user, not just current user
class StatHandler(BaseHandler):
    def post(self):
        # print self.request.get('user_id')
        view = self.request.get('view')
        tz_offset = int(self.request.get('tzoffset'))
        today = (datetime.datetime.now() - datetime.timedelta(hours = tz_offset)).date()

        if (view != '' and view == 'profile'):
            user_profile_id = self.request.get('user_id')
            user_id = str(self.current_user['id'])
            if(user_profile_id != user_id):
                user = models.User.get_by_key_name(user_profile_id)
                posts = user.goodthing_set.filter('deleted =',False).filter('public =', True).count()
                posts_today = user.goodthing_set.filter('created_origin >=', today).filter('deleted =',False).filter('public =', True).count()
                user.word_cloud.update_word_dict('public')
            else:
                user = models.User.get_by_key_name(user_id)
                posts = user.goodthing_set.filter('deleted =',False).count()
                posts_today = user.goodthing_set.filter('created_origin >=', today).filter('deleted =',False).count()
                user.word_cloud.update_word_dict('private')
        else:
            if self.request.get('user_id') == '':
                user_id = str(self.current_user['id'])
            else:
                user_id = self.request.get('user_id')
            user = models.User.get_by_key_name(user_id)
            posts = user.goodthing_set.filter('deleted =',False).count()
            posts_today = user.goodthing_set.filter('created_origin >=', today).filter('deleted =',False).count()
            user.word_cloud.update_word_dict('private')
        # posts_today = user.goodthing_set.filter('created_origin >=',datetime.date.today()).filter('deleted =',False).count()

        progress = int((float(posts_today)/3)*100)
        if progress > 100:
            progress = 100
        progress = str(progress) + '%'
        word_cloud = user.word_cloud.get_sorted_word_dict()
        reason_cloud = user.word_cloud.get_sorted_reason_dict()
        friend_cloud = user.word_cloud.get_sorted_friend_dict()
        result = {
            'posts_today':posts_today,
            'progress':progress,
            'posts':posts,
            'word_cloud':word_cloud,
            'reason_cloud':reason_cloud,
            'friend_cloud':friend_cloud
        }
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

# API for searching for good things matching for good_thing words or reasons
class SearchHandler(BaseHandler):
    def get(self):
        goodthing_user = self.request.get('user_id')
        if(goodthing_user is None or goodthing_user == ""):
            goodthing_user = str(self.current_user['id'])
        goodthing_word = self.request.get('goodthing_word')
        reason_word = self.request.get('reason_word')
        mention_name = self.request.get('friend_word')

        upload_url = blobstore.create_upload_url('/post')

        if(goodthing_word):
            gword = str(goodthing_word)
            index = search.Index(name=goodthing_user)
            # logging.info(goodthing_user)
            # logging.info("goodthing:" + gword)
            results = index.search("good_thing:" + gword)
            # logging.info(results)
            goodthing_list = []
            for aDocument in results:
                # goodthing_id = long(aDocument.fields[0].value);
                goodthing_id = long(aDocument.doc_id)
                goodthing = models.GoodThing.get_by_id(goodthing_id)
                goodthing_list.append(goodthing)
            result = [x.template(goodthing_user, upload_url=upload_url) for x in goodthing_list]
        elif(reason_word):
            rword = str(reason_word)
            index = search.Index(name=goodthing_user)
            results = index.search("reason:" + rword)
            reason_list = []
            for aDocument in results:
                # goodthing_id = long(aDocument.fields[0].value);
                goodthing_id = long(aDocument.doc_id)
                reason = models.GoodThing.get_by_id(goodthing_id)
                reason_list.append(reason)
            result = [x.template(goodthing_user, upload_url=upload_url) for x in reason_list]
        elif(mention_name):
            mword = str(mention_name)
            index = search.Index(name=goodthing_user)
            results = index.search("mentions:" + mword)
            mention_list = []
            for aDocument in results:
                # goodthing_id = long(aDocument.fields[0].value); 
                goodthing_id = long(aDocument.doc_id)          
                mention = models.GoodThing.get_by_id(goodthing_id)
                mention_list.append(mention)
            result = [x.template(goodthing_user, upload_url=upload_url) for x in mention_list]

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))


# API for getting all of the current user's unread notifications
# after this API has been called once all notifications are marked as read
class NotificationHandler(BaseHandler):
    def get(self):
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        notification_list = models.Notification.all().filter('to_user =',user).filter('read =',False)
        result = []
        for notification in notification_list:
            result.append(notification.template())
            notification.read = True
            notification.put()

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(result))

# serve the profile page for a public user
class ProfileHandler(BaseHandler):
    def get(self, userid):
        user_id = str(self.request.get('userid'))
        current_user_id = str(self.current_user['id'])

        user = models.User.get_by_key_name(user_id)
        if (user.user_type == 2):
            logging.info("public profile")
            template = jinja_environment.get_template('profile.html')
            template_values = {
                'facebook_app_id':FACEBOOK_APP_ID,
                'user_id':user_id,
                'user_name':user.name,
                'current_user_id': current_user_id
            }
        elif (user_id == current_user_id):
            logging.info("entering private user's profile")
            template = jinja_environment.get_template('private_profile.html')
            template_values = {
                'facebook_app_id':FACEBOOK_APP_ID,
                'user_id':user_id,
                'user_name':user.name,
                'current_user_id': current_user_id
            }
        self.response.out.write(template.render(template_values))

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),'templates')),
    autoescape=True,
    extensions=['jinja2.ext.autoescape'],
)

# send email reminder
class ReminderHandler(BaseHandler):
    def get(self):
        logging.info("In ReminderHandler")
        users = models.User.all()
        for user in users:
            # if (user.public_user == True):
            #     user.user_type = 2
            # else:
            #     user.user_type = 1
            # user.put()
            # if (user.id == "486465554889959" or user.id == "1598935150376651"):
            #     user.survey_id = ""
            #     user.put()
            #=======================================================================
            # Reminder starts here
            reminder_days = int(user.settings.reminder_days)
            logging.info(str(user.name) + ", reminder_days=" + str(reminder_days))
            if(reminder_days != -1):
                last_date_to_post = (datetime.datetime.now() - datetime.timedelta(days = reminder_days)).date()
                num_posts = user.goodthing_set.filter('created >=', last_date_to_post).filter('deleted =',False).count()
                logging.info("last_date_to_post=" + str(last_date_to_post) + ", num_posts=" + str(num_posts))
                if(num_posts <= 0):
                    latest_post = user.goodthing_set.order('-created').get()
                    if (latest_post is None):
                        latest_post_date = user.created
                    else:
                        latest_post_date = latest_post.created
                    days_no_posting = (datetime.datetime.now() - latest_post_date).days
                    # if(user.name == "Magi Chung"):
                    if (user.email != "" and user.email is not None):
                        message = mail.EmailMessage()
                        if(user.user_type == 0):
                            message.subject = "Reminder: Post a early memory to 3gt!"
                            message.sender = "happyapp@uw.edu" #TODO: change sender address
                            message.to = user.email
                            EmailMessageage.body = "Dear %s, you haven't posted your early memories for the past %d days.\n" %(user.name, days_no_posting)
                            message.body += "Post your early memory today at http://tgt-dev.appspot.com/!\n"
                        else:
                            message.subject = "Reminder: Post a good thing to 3gt!" #TOOD: change subject
                            message.sender = "happyapp@uw.edu" #TODO: change sender address
                            message.to = user.email
                            message.body = "Dear %s, you haven't posted your good things for the past %d days.\n" %(user.name, days_no_posting)
                            message.body += "Post your good thing today at http://tgt-dev.appspot.com/!\n"

                        message.send()
                        logging.info("Sent reminder to " + str(message.to))
                    else:
                        logging.info(user.name + " do not have an email in the record.")
            #=======================================================================
            # Survey reminder starts here
            # date_since_enroll = (datetime.datetime.now() - user.created).days
            # logging.info("date_since_enroll=" + str(date_since_enroll))

            # survey_no = -1
            # if(date_since_enroll < 30 and date_since_enroll >= 7 and user.survey_1_id is None):
            #     survey_no = 1
            # elif(date_since_enroll < 90 and date_since_enroll >= 30 and user.survey_2_id is None):
            #     survey_no = 2
            # elif(date_since_enroll < 180 and date_since_enroll >= 90 and user.survey_3_id is None):
            #     survey_no = 3
            # elif(date_since_enroll >= 180 and user.survey_4_id is None):
            #     survey_no = 4
            
            # if (survey_no > 0 and user.email != "" and user.email is not None):
            #     message = mail.EmailMessage() 
            #     message.subject = "[Online Positive Psychology Study] Answer some questions to earn a chance for lottery!"
            #     message.sender = "happyapp@uw.edu" #TODO: change sender address
            #     message.to = user.email
            #     message.body = "Dear %s, Thank you for participating in the online positive psychology study.\n" %(user.name)
            #     message.body += "Please help us answer a few questions and get a chance to win in the raffle!\n"
            #     message.body += "You can access the survey here: http://tgt-dev.appspot.com/survey?survey_no=%d\n" %(survey_no)

            #     message.send()
            #     logging.info("Sent survey reminder to " + str(message.to))
            # else:
            #     logging.info(user.name + " do not have an email in the record.")
                
            #=========================================================================             
            # clean search index
            # docindex = search.Index(name='1598935150376651')
            # try:
            #     while True:
            #         document_ids = [document.doc_id for document in docindex.get_range(ids_only=True)]
            #         if not document_ids:
            #             break
            #     # logging.info(len(document_ids))
            #         docindex.delete(document_ids)
            # except search.Error:
            #     logging.exception("Error deleting documents:")

# change user type
class AdminHandler(BaseHandler):
    def get(self):
        current_user = self.current_user
        template = jinja_environment.get_template('admin.html')
        template_values = {
                'facebook_app_id':FACEBOOK_APP_ID,
                'current_user':current_user,
        }
        self.response.out.write(template.render(template_values))

    # update the public/private field after the user has passed through the intro
    # screen.
    def post(self):
        user_id = str(self.current_user['id'])
        user = models.User.get_by_key_name(user_id)
        logging.info("user_type=" + str(self.request.get('user_type')))
        # public version of the app
        if self.request.get('user_type') == 'public':
            # user.public_user = True
            user.user_type = 2
        # private version of the app
        elif self.request.get('user_type') == 'private':
            # user.public_user = False
            user.user_type = 1
        # placebo version of the app
        elif self.request.get('user_type') == 'placebo':
            user.user_type = 0
        user.put()

        
