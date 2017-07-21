#edited
import falcon
import json
from datetime import date
import random
import os

from peewee import *
from falcon_cors import CORS
from playhouse.shortcuts import model_to_dict, dict_to_model
from falcon_multipart.middleware import MultipartMiddleware
import boto3

cors = CORS(allow_origins_list=['http://localhost:8000'],
            allow_all_headers=True,
            allow_all_methods=True)

client = boto3.client(
	's3',
	aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
	aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)

BASE_AWS_URL = 'https://s3.us-east-2.amazonaws.com/contacts-cloud-images/'


# s3 = boto3.resource('s3')
# bucket = s3.Bucket('contacts-cloud-images')
# client = boto3.client('s3')

def handle_date(x):
	if isinstance(x, date):
		return x.isoformat()
	raise TypeError('Unkown type')

#declare resources and instantiate it
class ContactsResource(object):

	def on_get(self, req, res):
		res.status = falcon.HTTP_200
		contacts = Contact.select().order_by(+Contact.last_name)
		contact_list = []
		for contact in contacts:
			contact_list.append(model_to_dict(contact))
			# print(model_to_dict(contact))
		res.status = falcon.HTTP_OK
		res.body = (json.dumps(contact_list, default=handle_date))


	def on_post(self, req, res):
		res.status = falcon.HTTP_200
		req_json = json.loads(req.stream.read().decode('utf-8'))
		print(req_json)
		contact = Contact(
			first_name=req_json['firstName'],
			last_name=req_json['lastName'],
			phone_number=req_json['phoneNumber'],
			zip_code=req_json['zipCode']
		)
		if req_json['dob']:
			j_dob = req_json['dob']
			contact.dob = date(int(j_dob[0:4]), int(j_dob[5:7]), int(j_dob[8:10]))
		contact.save()
		res.status = falcon.HTTP_CREATED
		res.body = (json.dumps(model_to_dict(contact), default=handle_date))


	def on_delete(self, req, res):
		item_id = req.get_param('id')
		Contact.get(Contact.id == item_id).delete_instance()
		res.body = (item_id)


	def on_put(self,req,res):
		jreq = json.loads(req.stream.read().decode('utf-8'))
		contact = Contact.get(Contact.id == jreq['id'])
		print(jreq['first_name'], jreq['last_name'])
		contact.first_name, contact.last_name = jreq['first_name'], jreq['last_name']
		contact.phone_number, contact.zip_code = jreq['phone_number'], jreq['zip_code']
		if jreq['dob'] != '' and jreq['dob'] != None:
			print(jreq['dob'])
			contact.dob = date(int(jreq['dob'][0:4]), int(jreq['dob'][5:7]), int(jreq['dob'][8:10]))
		contact.save()
		res.status = falcon.HTTP_OK
		res.body = (json.dumps(model_to_dict(contact), default=handle_date))


contacts_resource = ContactsResource()


class UploadResource(object):

	def on_post(self, req, res):
		contact_id = req.get_param('id')
		filename = req.get_param('file').filename
		file = req.get_param('file').file
		salt = ''.join(chr(random.randint(97, 122)) for i in range(20))
		filename = salt + '-' + filename

		client.upload_fileobj(file, 'contacts-cloud-images', filename)	

		contact = Contact.get(Contact.id == contact_id)
		contact.image_url = BASE_AWS_URL + filename
		contact.save()
		res.body = (contact.image_url)




upload_resource = UploadResource()



# app = falcon.API()
app = falcon.API(middleware=[cors.middleware, MultipartMiddleware()])

app.add_route('/api/contacts', contacts_resource)
app.add_route('/api/upload', upload_resource)



#declare database
db = SqliteDatabase('people.db')

# declare models and their fields
class Contact(Model):
	image_url = CharField(null=True)
	first_name = CharField(max_length=60)
	last_name = CharField(null=True, max_length=60)
	dob = DateField(null=True)
	phone_number = CharField(null=True)
	zip_code = CharField(max_length=10, null=True)

	class Meta:
		database = db


#create helper methods for creating, dropping, and recreating tables
#next iteration of this would be to use the schema migration playground extension
def create_tables():
	db.create_tables([Contact], safe=True)

def drop_tables():
	db.drop_tables([Contact], safe=True)

def recreate_tables():
	db.drop_tables([Contact], safe=True)
	db.create_tables([Contact], safe=True)

def populate_db():
	mock_data = json.loads(open('./mock_data.json').read())
	for index, contact in enumerate(mock_data):
		print(contact['dob'])
		if index == 20:
			break




