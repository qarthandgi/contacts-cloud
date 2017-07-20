#edited
import falcon
import json
from datetime import date

from peewee import *
from falcon_cors import CORS
from playhouse.shortcuts import model_to_dict, dict_to_model

cors = CORS(allow_origins_list=['http://localhost:8000'],
            allow_all_headers=True,
            allow_all_methods=True)


def handle_date(x):
	if isinstance(x, date):
		return x.isoformat()
	raise TypeError('Unkown type')

#declare resources and instantiate it
class ContactsResource(object):

	def on_get(self, req, res):
		db.connect()
		res.status = falcon.HTTP_200
		contacts = Contact.select().order_by(+Contact.last_name)
		contact_list = []
		for contact in contacts:
			contact_list.append(model_to_dict(contact))
			# print(model_to_dict(contact))
		res.status = falcon.HTTP_OK
		res.body = (json.dumps(contact_list, default=handle_date))
		db.close()

	def on_post(self, req, res):
		db.connect()
		res.status = falcon.HTTP_200
		req_json = json.loads(req.stream.read().decode('utf-8'))
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
		db.close()

	def on_delete(self, req, res):
		db.connect()
		item_id = req.get_param('id')
		Contact.get(Contact.id == item_id).delete_instance()
		res.body = (item_id)
		db.close()

	def on_put(self,req,res):
		db.connect()
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
		db.close()


contacts_resource = ContactsResource()

# app = falcon.API()
app = falcon.API(middleware=[cors.middleware])

app.add_route('/api/contacts', contacts_resource)

#declare database
db = SqliteDatabase('people.db')

# declare models and their fields
class Contact(Model):
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
	db.connect()
	db.create_tables([Contact], safe=True)
	db.close()

def drop_tables():
	db.connect()
	db.drop_tables([Contact], safe=True)
	db.close()

def recreate_tables():
	db.connect()
	db.drop_tables([Contact], safe=True)
	db.create_tables([Contact], safe=True)
	db.close()

def populate_db():
	mock_data = json.loads(open('./mock_data.json').read())
	for index, contact in enumerate(mock_data):
		print(contact['dob'])
		if index == 20:
			break




