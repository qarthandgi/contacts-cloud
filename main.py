#edited
import falcon

class TestResource(object):
	def on_get(self, req, res):
		res.status = falcon.HTTP_200
		res.body = ('This is me, Falcon, serving a resource HEY ALL!')

app = falcon.API()

test_resource = TestResource()

app.add_route('/test', test_resource)
