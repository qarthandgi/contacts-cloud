var ax = axios.create({
	baseURL: 'http://contacts.byonddesigns.com/api/',
	// baseURL: 'http://localhost:5000/api/',
	timeout: 20000,
	headers: {}
});

// COMPONENTS ------------
Vue.component('a-contact', {
	props: ['contact', 'contactid'],
	template: '#a-contact',
	computed: {
		isActive: function() {
			return this.contact.id == this.contactid ? true : false;
		},
		imageUrl: function() {
			return "url('" + this.contact.image_thumb_url + "')";
		}
	},
	methods: {
		deleteThis: function() {
			this.$emit('delete-this', this.contact.id);
		},
		selectThis: function() {
			this.$emit('select-this', this.contact.id);
			this.$emit('toggle-side-peak');
		}
	}
});

Vue.component('selected-contact', {
	props: ['contact', 'contactid', 'currentzipcode'],
	template: '#selected-contact',
	methods: {
		editThis: function() {
			this.$emit('edit-this');
		},
		deleteThis: function() {
			this.$emit('delete-this', this.contactid);
		}
	},
	computed: {
		imageUrl: function() {
			return "url('" + this.contact.image_url + "')";
		},
		humanDate: function() {
			return moment(this.contact.dob).format('MMMM Do, YYYY');
		}
	}
});

Vue.component('contact-operation', {
	props: ['usermodel', 'newstate'],
	data: function() {
		return {
			image: '',
			humanDate: ''
		};
	},
	computed: {
		imageUrl: function() {
			return this.newstate ? "url('" + this.image + "')" : "url('" + this.usermodel.imageUrl + "')";
		}
	},
	template: '#contact-operation',
	methods: {
		handlePhoneNumber: function() {
			this.usermodel.phoneNumber = this.usermodel.phoneNumber.replace(/[^0-9+()\-x\s]/g, '');
		},
		handleZipCode: function() {
			this.usermodel.zipCode = this.usermodel.zipCode.replace(/[^0-9]/g, '');
		},
		updateThis: function() {
			this.$emit('update-this');
		},
		createThis: function() {
			this.$emit('create-this');
			// this.resetFileUpload();
			this.image = '';
		},
		onPlacingFile: function() {
			var file = this.$refs['file-upload'].files[0];
			this.$emit('place-file', file);
		},
		cancelOperate: function() {
			if (this.newstate) {
				this.resetFileUpload();
			}
			this.$emit('toggle-operate');
			this.image = '';
		},
		resetFileUpload: function() {
			this.$refs['file-upload'].value = '';
		},
		onFileChange: function(e) {
			var files = e.target.files || e.dataTransfer.files;
			if (!files.length) {
				return;
			}
			this.createImage(files[0]);
		},
		createImage: function(file) {
			this.onPlacingFile();
			var reader = new FileReader();
			var that = this;
			reader.onload = function(e) {
				if (that.newstate) {
					that.image = e.target.result;
				} else {
					that.usermodel.imageUrl = e.target.result;
				}
			};
			reader.readAsDataURL(file);
		},
		triggerFileDialog: function() {
			$(this.$refs['file-upload']).trigger('click');
		},
		placeDate: function() {
			this.$emit('place-date', this.$refs['dob-picker'].value);
		}
	},
	mounted: function() {
		this.$refs['dob-picker'].value = this.usermodel.dob;
		var that = this;
		var picker = new Pikaday({
			field: this.$refs['dob-picker'],
			trigger: this.$refs['actual-dob'],
			yearRange: [1900, 2017],
			format: 'YYYY-MM-DD',
			onClose: function(){
				that.humanDate = picker.toString('MMMM Do, YYYY');
				that.placeDate();
			}
		});
		if (this.usermodel.dob) {
			this.humanDate = picker.getMoment().format('MMMM Do, YYYY');
		}
	}
});


// INSTANTIATE VUE ------------
var app = new Vue({
	el: '#app',

	// STATE ------------
	data: {
		contacts: [],
		sortLastName: true,
		selectedContactId: undefined,
		selectedContactZipCode: '',
		newState: false,
		operationPanelActive: false,
		uploadFile: undefined,
		fileToUpload: false,
		breakpoint: 900,
		compactState: false,
		sidePeaking: false,
		searchText: '',
		searchActive: false,
		userModel: {
			id: null,
			imageFormData: null,
			imageUrl: '',
			firstName: '',
			lastName: '',
			dob: '',
			phoneNumber: '',
			zipCode: ''
		}
	},

	// COMPUTED PROPERTIES ------------
	computed: {
		selectedContact: function() {
			for(var i = 0; i < this.contacts.length; i++) {
				if (this.selectedContactId === this.contacts[i].id) {
					return this.contacts[i];
				}
			}
		}
	},

	// METHODS ------------
	methods: {
		sortContacts: function() {
			var that = this;
			this.contacts.sort(function(a,b) {
				var nameA = that.sortLastName ? a.last_name.toUpperCase() : a.first_name.toUpperCase();
				var nameB = that.sortLastName ? b.last_name.toUpperCase() : b.first_name.toUpperCase();
				return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
			});
		},
		placeFile: function(file) {
			this.uploadFile = file;
			this.fileToUpload = true;
		},
		placeDate: function(date) {
			this.userModel.dob = date;
		},
		deleteItem: function(id) {
			var that = this;
			ax.delete('/contacts', {
				params: {
					id: id
				}
			}).then(function(data) {
				console.log(data)
				for(var i = 0; i < that.contacts.length; i++) {
					if (that.contacts[i].id === parseInt(data.data)) {
						that.contacts.splice(i, 1);
						console.log(that.contacts);
						console.log(i);
						if (i == that.contacts.length) {
							that.selectedContactId = that.contacts[i-1].id;
						} else {
							that.selectedContactId = that.contacts[i].id;
						}
						break;
					}
				}
			}).catch(function(err) {
				console.log('activating');
				$(that.$refs['no-results']).addClass('active');
			});
		},
		toggleOperationPanel: function() {
			this.operationPanelActive = false;
		},
		newItem: function() {
			this.toggleSidePeak();
			this.newState = true;
			this.userModel = {
				id: null,
				imageFormData: null,
				firstName: '',
				lastName: '',
				dob: '',
				phoneNumber: '',
				zipCode: ''
			};
			this.operationPanelActive = true;
		},
		createItem: function() {
			var that = this;
			ax.post('/contacts', {
				imageFormData: that.userModel.imageFormData,
				firstName: that.userModel.firstName,
				lastName: that.userModel.lastName,
				dob: that.userModel.dob,
				phoneNumber: that.userModel.phoneNumber,
				zipCode: that.userModel.zipCode
			}).then(function(res) {
				app.operationPanelActive = false;
				that.contacts.push(res.data);
				app.sortContacts();
				app.selectedContactId = res.data.id;
				var refresh = app.selectedContact;
				$(that.$refs['no-results']).removeClass("active");

				if (that.fileToUpload) {
					console.log(that.fileToUpload);
					var data = new FormData();
					data.append('id', res.data.id);
					data.append('file', that.uploadFile);
					ax.post('/upload', data).then(function(res) {
						for (var i = that.contacts.length - 1; i >= 0; i--) {
							if (app.selectedContactId == that.contacts[i].id) {
								console.log(res);
								that.contacts[i].image_url = res.data[0];
								that.contacts[i].image_thumb_url = res.data[1];
								break;
							}
						}
						that.uploadFile = undefined;
						that.fileToUpload = false;
					}).catch(function(err) {
						console.log(err);
					});
				}
			}).catch(function(err) {
				console.log('System Error');
			});
		},
		editItem: function() {
			this.newState = false;
			this.userModel = {
				id: this.selectedContact.id,
				imageUrl: this.selectedContact.image_url,
				firstName: this.selectedContact.first_name,
				lastName: this.selectedContact.last_name,
				dob: this.selectedContact.dob,
				phoneNumber: this.selectedContact.phone_number,
				zipCode: this.selectedContact.zip_code
			};
			this.operationPanelActive = true;
		},
		selectItem: function(id) {
			this.selectedContactId = id;
		},
		updateItem: function() {
			var that = this;
			ax.put('/contacts', {
				id: that.userModel.id,
				first_name: that.userModel.firstName,
				last_name: that.userModel.lastName,
				dob: that.userModel.dob,
				phone_number: that.userModel.phoneNumber,
				zip_code: that.userModel.zipCode 
			}).then(function(res) {
				var contact;
				var data = res['data'];
				for (var i = 0; i < that.contacts.length; i++) {
					if (that.contacts[i].id === that.selectedContactId) {
						contact = that.contacts[i];
					}
				}
				contact.first_name = data['first_name'];
				contact.last_name = data['last_name'];
				contact.dob = data['dob'];
				contact.phone_number = data['phone_number'];
				contact.zip_code = data['zip_code'];
				app.operationPanelActive = false;
				app.sortContacts();

				if (that.fileToUpload) {
					var data = new FormData();
					data.append('id', contact.id);
					data.append('file', that.uploadFile);
					ax.post('/upload', data).then(function(res) {
						for (var i = that.contacts.length - 1; i >= 0; i--) {
							if (app.selectedContactId == that.contacts[i].id) {
								that.contacts[i].image_url = res.data[0];
								that.contacts[i].image_thumb_url = res.data[1];
								break;
							}
						}
						that.uploadFile = undefined;
						that.fileToUpload = false;
					}).catch(function(err) {
						console.log(err);
					});
				}
			}).catch(function(err) {
				console.log(err);
			});
		},
		searchInput: function() {
			if (this.searchText === '') {
				this.searchActive = false;
				this.$refs['search-input'].blur();
			}
			var that = this;
			ax.get('/search', {
				params: {
					search: this.searchText
				}
			}).then(function(res) {
				if (res.data.length === 0) {
					$(that.$refs['no-results']).addClass("active");
					that.contacts = [];
					return;
				} else {
					$(that.$refs['no-results']).removeClass("active");
				}
				that.contacts = res.data;
				that.selectedContact = that.contacts[0];
				that.selectedContactId = that.contacts[0].id;
				that.sortContacts();
			});
		},
		activateSearch: function() {
			this.searchActive = true;
		},
		handleSearchIcon: function() {
			if (this.searchActive === true) {
				this.searchText = '';
				this.searchInput();
				this.searchActive = false;
			} else {
				this.$refs['search-input'].focus();
				this.searchActive = true;
			}
		},
		deactivateSearchOnNone: function() {
			if (this.searchText === '') {this.searchActive = false;}
		},
		toCompact: function() {
			this.$refs['side-stage'].dataset.arrange = "hiding";
			this.$refs['main-stage'].dataset.arrange = "full";
			this.compactState = true;
		},
		toFull: function() {
			this.$refs['side-stage'].dataset.arrange = "pinned";
			this.$refs['main-stage'].dataset.arrange = "partial";
			this.compactState = false;
			this.sidePeaking = false;
		},
		toggleSidePeak: function() {
			if (this.compactState == true) {
				if (!this.sidePeaking) {
					this.$refs['side-stage'].dataset.arrange = "peaking";
					this.$refs['side-toggler'].dataset.arrange = "close-potential";
					this.sidePeaking = true;
				} else {
					this.$refs['side-stage'].dataset.arrange = "hiding";
					this.$refs['side-toggler'].dataset.arrange = "open-potential";
					this.sidePeaking = false;
				}
			}
		}
	},

	// WATCHERS ------------
	watch: {
		sortLastName: function(newSortLastName) {
			this.sortContacts();
		},
		selectedContact: function() {
			if (this.selectedContact === undefined) {
				return;
			}
			this.geocoder.geocode({'address': this.selectedContact.zip_code}, function(results, status) {
				if (status == 'OK' && results[0]['address_components'][0]['types'][0] == 'postal_code') {
					console.log(results);
					app.map.setZoom(7);
					app.map.panTo(results[0].geometry.location);
					app.selectedContactZipCode = results[0]['formatted_address'];
				} else {
					app.map.setZoom(1);
					app.selectedContactZipCode = '';
					console.log('Geocoder not successful');
				}
			});
		}
	},

	// LIFECYCLE HOOKS ------------
	beforeCreate: function() {
		var that = this;
		ax.get('/contacts')
			.then(function(data) {
				if (!data.data.length) {
					$(that.$refs['no-results']).addClass("active");
				}
				for (var i = 0; i < data.data.length; i++) {
					if (i === 0)  {
						app.selectedContactId = data.data[i].id;
					}
					app.contacts.push(data.data[i]);
				}
				app.sortContacts();
			}).catch(function(err) {
				console.log(err);
			});
	},
	mounted: function() {
		this.map = new google.maps.Map(this.$refs.map, {
			zoom: 1,
			center: {lat: 35.363, lng: -21.044},
			mapTypeControl: false,
			styles: [
						{
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#f5f5f5"
						  }
						]
						},
						{
						"elementType": "labels.icon",
						"stylers": [
						  {
						    "visibility": "off"
						  }
						]
						},
						{
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#616161"
						  }
						]
						},
						{
						"elementType": "labels.text.stroke",
						"stylers": [
						  {
						    "color": "#f5f5f5"
						  }
						]
						},
						{
						"featureType": "administrative.land_parcel",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#bdbdbd"
						  }
						]
						},
						{
						"featureType": "poi",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#eeeeee"
						  }
						]
						},
						{
						"featureType": "poi",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#757575"
						  }
						]
						},
						{
						"featureType": "poi.park",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#e5e5e5"
						  }
						]
						},
						{
						"featureType": "poi.park",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#9e9e9e"
						  }
						]
						},
						{
						"featureType": "road",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#ffffff"
						  }
						]
						},
						{
						"featureType": "road.arterial",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#757575"
						  }
						]
						},
						{
						"featureType": "road.highway",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#dadada"
						  }
						]
						},
						{
						"featureType": "road.highway",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#616161"
						  }
						]
						},
						{
						"featureType": "road.local",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#9e9e9e"
						  }
						]
						},
						{
						"featureType": "transit.line",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#e5e5e5"
						  }
						]
						},
						{
						"featureType": "transit.station",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#eeeeee"
						  }
						]
						},
						{
						"featureType": "water",
						"elementType": "geometry",
						"stylers": [
						  {
						    "color": "#c9c9c9"
						  }
						]
						},
						{
						"featureType": "water",
						"elementType": "labels.text.fill",
						"stylers": [
						  {
						    "color": "#9e9e9e"
						  }
						]
						}
					]
		});
		this.geocoder = new google.maps.Geocoder();
		window.innerWidth <= this.breakpoint ? this.toCompact() : this.toFull();
		var that = this;
		window.addEventListener('resize', function(event) {
			if (window.innerWidth <= that.breakpoint && that.compactState == false) {
				that.toCompact();
			} else if (window.innerWidth > that.breakpoint && that.compactState == true) {
				that.toFull();
			}
		});
	}
});

$(window).on('load', function() {
	$('#loading').addClass("remove");
	setTimeout(function() {
		$('#loading').hide();
	}, 600);
});