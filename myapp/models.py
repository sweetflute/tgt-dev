import json
import string, re
import datetime
from google.appengine.ext import db
from collections import Counter,OrderedDict
from google.appengine.ext.blobstore import blobstore
from google.appengine.api import images
from google.appengine.api import search

import logging

# model for user's settings
class Settings(db.Model):
    reminder_days = db.IntegerProperty(default=0)
    default_fb = db.BooleanProperty(default=False)
    default_public = db.BooleanProperty(default=True)

    def template(self, user_name, display_name):
        if (user_name == display_name):
            same_name = True
        else:
            same_name = False

        template = {
            'reminder_days':self.reminder_days,
            'default_fb':self.default_fb,
            'default_public':self.default_public,
            'short_name':self.short_name(user_name),
            'user_name':user_name,
            'same_name':same_name
        }
        return template

    def short_name(self, username):
        ss = username.split()
        return '%s %s.' % (ss[0], ss[-1][0])

# model for a user's wordcloud. stores a json representation of a counter object
# and most recent update time
class WordCloud(db.Model):
    word_dict = db.TextProperty(default=None)
    reason_dict = db.TextProperty(default=None)
    friend_dict = db.TextProperty(default=None)
    updated = db.DateTimeProperty(auto_now_add=True)
    pv_updated = db.DateTimeProperty(auto_now_add=True)
    stopwords = db.StringListProperty(default=['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'isn', 'are', 'aren', 'was', 'wasn', 'were', 'weren', 'be', 'been', 'being', 'have', 'haven', 'has', 'hasn', 'had', 'hadn', 'having', 'do', 'don', 'does', 'doesn', 'did', 'didn', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'today', 'yesterday', 'good', 'great', 'nice'])

    # update the word counter.  only load posts since last update time
    # store the counter as json and change the last updated time
    def update_word_dict(self, profile_type):
        counter = Counter()
        rcounter = Counter()
        fcounter = Counter()
        # replace_punctuation = string.maketrans(string.punctuation, ' '*len(string.punctuation))

        # logging.info(self.stopwords)
        self.stopwords += ['today', 'yesterday', 'good', 'great', 'nice']

        # logging.info(self.stopwords)

        if self.word_dict:
            counter.update(json.loads(self.word_dict))
            logging.info("self.word_dict exist")
        if self.reason_dict:
            rcounter.update(json.loads(self.reason_dict))
            logging.info("self.reason_dict exist")
        if self.friend_dict:
            fcounter.update(json.loads(self.friend_dict))
            logging.info("self.friend_dict exist")
        users = self.user_set.fetch(limit=None)

        if (profile_type == 'public'):
            for user in users:
                # count = 0
                index = search.Index(name=user.id)

                good_thing_list = user.goodthing_set.filter('created >=', self.updated).filter('public =',True).filter('deleted =',False).fetch(limit=None)
                # good_thing_list = user.goodthing_set.filter('public =',True).filter('deleted =',False).fetch(limit=None)
                for good_thing in good_thing_list:
                    # x = str(good_thing.good_thing).translate(replace_punctuation).lower()
                    # words = [word for word in x.split(' ') if word not in self.stopwords]

                    x = good_thing.good_thing.lower()
                    words = [word for word in re.split('[ '+ string.punctuation +']', x) if word not in self.stopwords]

                    counter.update(words)

                    #create search document
                    good_thing_document = search.Document(
                    doc_id=str(good_thing.key().id()),
                    fields=[#search.TextField(name='id', value=str(good_thing.key().id())),
                            # search.TextField(name='user_id', value=good_thing.user.id),
                            search.TextField(name='good_thing', value=x)],
                    language='en')

                    
                    index = search.Index(name=user.id)
                    try:    
                        index.put(good_thing_document)
                        # count += 1
                    except search.Error:
                        logging.exception('Failed to put document')
                # logging.info("adding " + str(count) + " documents")

            self.word_dict = json.dumps(counter)
            self.updated = datetime.datetime.now()
            self.put()       

        else:
            
            for user in users:
                # count = 0
                good_thing_list = user.goodthing_set.filter('created >=', self.updated).filter('deleted =',False).fetch(limit=None)
                # good_thing_list = user.goodthing_set.filter('deleted =',False).fetch(limit=None)
                for good_thing in good_thing_list:
                    # x = str(good_thing.good_thing).translate(replace_punctuation).lower()
                    # words = [word for word in x.split(' ') if word not in self.stopwords]

                    x = good_thing.good_thing.lower()
                    y = good_thing.reason.lower()
                    z = good_thing.get_mentions()

                    logging.info(x)
                    logging.info(z)

                    words = [word for word in re.split('[ '+ string.punctuation +']', x) if word not in self.stopwords]
                    rwords = [word for word in re.split('[ '+ string.punctuation +']', y) if word not in self.stopwords]
                    fnames = [mention['name'].encode('utf-8') for mention in z]

                    # logging.info(z)
                    # logging.info(fnames)
                    
                    counter.update(words)
                    rcounter.update(rwords)
                    fcounter.update(fnames)

                    #create search document
                    fnames_str = str(fnames).strip('[]')
                    logging.info(fnames_str)
                    good_thing_document = search.Document(
                    doc_id=str(good_thing.key().id()),
                    fields=[#search.TextField(name='id', value=str(good_thing.key().id())),
                            # search.TextField(name='user_id', value=str(good_thing.user.id)),
                            search.TextField(name='good_thing', value=x),
                            search.TextField(name='reason', value=y),
                            search.TextField(name='mentions', value=fnames_str)],
                    language='en')

                    
                    index = search.Index(name=user.id)
                    try:
                        index.put(good_thing_document)
                        # count += 1
                    except search.Error:
                        logging.exception('Failed to put document in ' + user.id)


                # logging.info("adding " + str(count) + " documents")



            self.word_dict = json.dumps(counter)
            self.reason_dict = json.dumps(rcounter)
            self.friend_dict = json.dumps(fcounter)
            self.updated = datetime.datetime.now()
            self.put()

    
    # return the 20 most common words as a sorted list of dictionaries
    def get_sorted_word_dict(self):
        if self.word_dict:
            word_dict = json.loads(self.word_dict)
            sorted_dict = OrderedDict(sorted(word_dict.items(), key=lambda t: t[1]))
            result = [{'word':word,'count':sorted_dict[word]} for word in sorted_dict][-20:]
            # print result
            return result
        else:
            return [{'word':"You haven't posted any good things!",'count':1}]

    # return the 20 reason common words as a sorted list of dictionaries
    def get_sorted_reason_dict(self):
        if self.reason_dict:
            reason_dict = json.loads(self.reason_dict)
            sorted_dict = OrderedDict(sorted(reason_dict.items(), key=lambda t: t[1]))
            result = [{'word':word,'count':sorted_dict[word]} for word in sorted_dict][-20:]
            # print result
            return result
        else:
            return [{'word':"You haven't posted any good things!",'count':1}]

    # return the 10 most common tagged friends
    def get_sorted_friend_dict(self):
        if self.friend_dict:
            friend_dict = json.loads(self.friend_dict)
            sorted_dict = OrderedDict(sorted(friend_dict.items(), key=lambda t: t[1]))
            result = [{'word':word,'count':sorted_dict[word]} for word in sorted_dict][-10:]
            # print result
            return result
        else:
            return [{'word':"You haven't tagged any friends!",'count':1}]


# model for each user based on facebook login information
class User(db.Model):
    id = db.StringProperty(required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    name = db.StringProperty(required=True)
    # display_name = db.StringProperty()
    display_name = db.StringProperty(required=True)
    profile_url = db.StringProperty(required=True)
    access_token = db.StringProperty(required=True)
    # public_user = db.BooleanProperty(default=None) # change default back to false
    user_type = db.IntegerProperty(default=-1) #0:placebo 1:private 2:public
    settings = db.ReferenceProperty(Settings,required=True)
    word_cloud = db.ReferenceProperty(WordCloud,required=True)
    email = db.StringProperty() #TODO: required=True
    survey_id = db.StringProperty()#initial survey ID
    survey_1_id = db.StringProperty()#1-week survey ID
    survey_2_id = db.StringProperty()#1-month survey ID
    survey_3_id = db.StringProperty()#3-month survey ID
    survey_4_id = db.StringProperty()#6-month survey ID

    # def admin_stat(self):
    #     stat = {
    #         'id':self.key().id(),
    #         'updated' = self.updated(),
    #         'type' = self.user_type
    #     }
    #     return stat

# model for each survey with unique survey id
class Survey(db.Model):
    # id = db.StringProperty(required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    survey_no = db.IntegerProperty() #0:initial, 1:1-week, 2:1-month, 3:3-month, 4:6-month
    email = db.StringProperty()
    age = db.StringProperty()
    gender = db.StringProperty()
    IPIP_1 = db.StringProperty()
    IPIP_2 = db.StringProperty()
    IPIP_3 = db.StringProperty()
    IPIP_4 = db.StringProperty()
    IPIP_5 = db.StringProperty()
    IPIP_6 = db.StringProperty()
    IPIP_7 = db.StringProperty()
    IPIP_8 = db.StringProperty()
    IPIP_9 = db.StringProperty()
    IPIP_10 = db.StringProperty()
    IPIP_11 = db.StringProperty()
    IPIP_12 = db.StringProperty()
    IPIP_13 = db.StringProperty()
    IPIP_14 = db.StringProperty()
    IPIP_15 = db.StringProperty()
    IPIP_16 = db.StringProperty()
    IPIP_17 = db.StringProperty()
    IPIP_18 = db.StringProperty()
    IPIP_19 = db.StringProperty()
    IPIP_20 = db.StringProperty()
    CESD_1 = db.StringProperty()
    CESD_2 = db.StringProperty()
    CESD_3 = db.StringProperty()
    CESD_4 = db.StringProperty()
    CESD_5 = db.StringProperty()
    CESD_6 = db.StringProperty()
    CESD_7 = db.StringProperty()
    CESD_8 = db.StringProperty()
    CESD_9 = db.StringProperty()
    CESD_10 = db.StringProperty()
    CESD_11 = db.StringProperty()
    CESD_12 = db.StringProperty()
    CESD_13 = db.StringProperty()
    CESD_14 = db.StringProperty()
    CESD_15 = db.StringProperty()
    CESD_16 = db.StringProperty()
    CESD_17 = db.StringProperty()
    CESD_18 = db.StringProperty()
    CESD_19 = db.StringProperty()
    CESD_20 = db.StringProperty()
    PERMA_1 = db.StringProperty()
    PERMA_2 = db.StringProperty()
    PERMA_3 = db.StringProperty()
    PERMA_4 = db.StringProperty()
    PERMA_5 = db.StringProperty()
    PERMA_6 = db.StringProperty()
    PERMA_7 = db.StringProperty()
    PERMA_8 = db.StringProperty()
    PERMA_9 = db.StringProperty()
    PERMA_10 = db.StringProperty()
    PERMA_11 = db.StringProperty()
    PERMA_12 = db.StringProperty()
    PERMA_13 = db.StringProperty()
    PERMA_14 = db.StringProperty()
    PERMA_15 = db.StringProperty()
    PERMA_16 = db.StringProperty()
    PERMA_17 = db.StringProperty()
    PERMA_18 = db.StringProperty()
    PERMA_19 = db.StringProperty()
    PERMA_20 = db.StringProperty()
    PERMA_21 = db.StringProperty()
    PERMA_22 = db.StringProperty()
    PERMA_23 = db.StringProperty()

# model for each good thing
# TODO: update to work with images
class GoodThing(db.Model):
    good_thing = db.StringProperty(required=True, multiline=True)
    reason = db.StringProperty(default=None, multiline=True)
    created = db.DateTimeProperty(auto_now_add=True)
    created_origin = db.DateTimeProperty(auto_now_add=True)
    user = db.ReferenceProperty(User,required=True)
    public = db.BooleanProperty(default=True)
    wall = db.BooleanProperty(default=False)
    deleted = db.BooleanProperty(default=False)
    blob_key = blobstore.BlobReferenceProperty()
    # img = db.BlobProperty()
    memory = db.BooleanProperty(default=False)
    # mentions_no = db.IntegerProperty(default=0)

    def template(self,user_id,cursor="", upload_url=""):
        # logging.info("user_id = " + str(user_id))
        # logging.info("current_user_id = " + str(self.user.id))
        if user_id == self.user.id:
            current_user = True
        else:
            current_user = False
        template = {
            'id':self.key().id(),
            'good_thing':self.good_thing,
            'reason':self.reason,
            'user_id':self.user.id,
            'user_name':self.user.name,
            'display_name':self.user.display_name,
            'cheer_names':self.get_cheers(),
            'num_cheers':self.num_cheers(),
            'is_cheered':self.is_cheered(),
            'num_comments':self.num_comments(),
            'is_commented':self.is_commented(),
            'current_user':current_user,
            'cheered':self.cheered(user_id),
            'mentions':self.get_mentions(),
            'num_mentions':self.num_mentions(),
            'public':self.is_public(),
            'created': str(self.created),
            'cursor': cursor,
            'upload_url': upload_url,
            'img_url': self.get_img_url()
        }
        return template

    # # return a list of cheers associated with this good thing
    # # if no cheers, return None
    # def get_cheers(self):
    #     cheers = self.cheer_set.fetch(limit=None)
    #     if cheers:
    #         result = [x.user.id for x in cheers]
    #     else:
    #         result = None
    #     return result

    # return true if the fb user id has cheered this good thing
    # else return false
    def cheered(self,user_id):
        user = User.get_by_key_name(user_id)
        cheer = self.cheer_set.filter('user =',user).get()
        if cheer:
            cheered = True
        else:
            cheered = False
        return cheered

    def short_name(self, username):
        ss = username.split()
        return '%s %s.' % (ss[0], ss[-1][0])

    # return a list of user names mentioned in this good thing
    def get_mentions(self):
        mentions = self.mention_set.ancestor(self).fetch(limit=None)
        if len(mentions) == 0:
            mentions = self.mention_set.fetch(limit=None)
        # print "get_mentions: len(mentions) = " + str(len(mentions)) + ", mentions_no = " + str(self.mentions_no)
        # if (self.mentions_no != 0):
            # while(len(mentions) < self.mentions_no):
                # mentions = self.mention_set.fetch(limit=None)
        if self.user.name != self.user.display_name:
            result = [{'name':self.short_name(mention.to_user_name), 'id':mention.to_fb_user_id} for mention in mentions]
        else:
            result = [{'name':mention.to_user_name, 'id':mention.to_fb_user_id} for mention in mentions]
        # logging.info("get_mentions:" + str(result))
        return result

    # return the number of mentions
    def num_mentions(self):
        count = self.mention_set.ancestor(self).count()
        if count == 0:
            count = self.mention_set.count()
        # logging.info("model: num_metions=" + str(count))
        if count > 0:
            return count
        else:
            return None

    # return a list of user names cheered this good thing
    def get_cheers(self):
        cheers = self.cheer_set.fetch(limit=None)
        result = [{'cheer_name':cheer.user.name} for cheer in cheers]
        # logging.info("get_mentions:" + str(result))
        return result

    #maybe delete
    def num_cheers(self):
        return self.cheer_set.count()

    def is_cheered(self):
        if self.num_cheers() > 0:
            return True
        else:
            return False

    # return the number of comments
    def num_comments(self):
        return self.comment_set.filter('deleted =',False).count()

    def is_commented(self):
        if self.num_comments() > 0:
            return True
        else:
            return False

    # check if the post is public or private
    def is_public(self):
        if self.public:
            return "public"
        else:
            return "private"
    
    def get_img_url(self):
        # logging.info("get_img_url")
        if (self.blob_key is not None):
            # logging.info(images.get_serving_url(self.blob_key, size=400))
            return images.get_serving_url(self.blob_key, size=400)
        else:
            return None





# model for a cheer associated with a good thing
class Cheer(db.Model):
    user = db.ReferenceProperty(User,required=True)
    good_thing = db.ReferenceProperty(GoodThing,required=True)
    created = db.DateTimeProperty(auto_now_add=True)

# model for a comment associated with a good thing
class Comment(db.Model):#TODO: add time and fix timezone issues for comment
    comment_text = db.StringProperty(required=True)
    user = db.ReferenceProperty(User,required=True)
    good_thing = db.ReferenceProperty(GoodThing,required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    deleted = db.BooleanProperty(default=False)

    def template(self,user_id):
        if user_id == self.user.id:
            current_user = True
        else:
            current_user = False
        template = {
            'id':self.key().id(),
            'comment_text':self.comment_text,
            'user_name':self.user.name,
            'display_name':self.user.display_name,
            'user_id':self.user.id,
            'comment_created': str(self.created),
            'good_thing_id':self.good_thing.key().id(),
            'current_user':current_user
        }
        return template

# model for a mention associated with a good thing and a user's fb friend
# associates with to_user model if the user is a 3GT user
class Mention(db.Model):
    to_fb_user_id = db.StringProperty(required=True)
    to_user_name = db.StringProperty(required=True)
    to_user = db.ReferenceProperty(User)
    good_thing = db.ReferenceProperty(GoodThing,required=True)
    created = db.DateTimeProperty(auto_now_add=True)

# model for a notification (cheer, comment, mention)
class Notification(db.Model):
    from_user = db.ReferenceProperty(User,required=True, collection_name='from_user_set')
    to_user = db.ReferenceProperty(User,required=True,collection_name='to_user_set')
    event_type = db.StringProperty(required=True)
    event_id = db.StringProperty(required=True) # change to required = True
    created = db.DateTimeProperty(auto_now_add=True)
    read = db.BooleanProperty(default=False)

    def template(self):
        template = {
            'from_user':self.from_user.name,
            'event_type':self.event_type,
            'event_id':self.event_id,
        }
        return template
