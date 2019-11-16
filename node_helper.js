const path = require("path")
var request = require('request');
var NodeHelper = require('node_helper');
var ping = require('ping');
var Smartglass = require('xbox-smartglass-core-node');
var exec = require('child_process').exec
const igdb = require('igdb-api-node').default;


async function IGDB_game(name,key) {
	const response = await igdb(key)
    	.fields('name,cover')
    	.limit(1)
    	.search(name)
	.where('platforms = (49)')
    	.request('/games');

	return response.data
};

async function IGDB_img(id,key) {
	const response = await igdb(key)
	.fields('game,url')
	.limit(1)
	.where('game = ' + id)
	.request('/covers');

	return response.data
};

module.exports = NodeHelper.create({

    start: function() {
        console.log('Démarrage du node_helper pour le module ' + this.name + '...');
	this.XBOX = {
		"ip" : "",
		"display": "",
		"status": false,
		"xbname": null,
		"name" : null,
		"realname" : null,
		"type": null,
		"idgame": null,
		"idcover": null,
		"img": "",
		"liveid": ""
	}
	this.XBOX_db = []
	this.actually = ""
	this.lastgame = ""

	this.XBOX_realname= ""
	this.XBOX_idgame = ""
	this.XBOX_idcover = ""
	this.XBOX_img = ""
    },

   xbox_Status: function (ip) {
	var sgClient = Smartglass()
	var self = this;
	var deviceStatus = { current_app: false, connection_status: false };

	sgClient.connect(ip).then(function(){
		self.XBOX.status = true;
	}, function(error){
		self.XBOX.status = false;
		self.XBOX.xbname = null;
		self.XBOX.name = null;
		self.XBOX.type = null
	});

	if (this.XBOX.status) {
		sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
			deviceStatus.connection_status = true
				if(message.packet_decoded.protected_payload.apps[0] != undefined){
					if(deviceStatus.current_app != message.packet_decoded.protected_payload.apps[0].aum_id){
						deviceStatus.current_app = message.packet_decoded.protected_payload.apps[0].aum_id;
						self.XBOX.xbname = deviceStatus.current_app;
					}
				}
		}.bind(deviceStatus));
	}
    },

    updateDB: function(payload) {
	var self = this;
    	var dir = path.resolve(__dirname, "")
    	var cmd = "cd " + dir + "; cp xbox.db xbox.db.sav ; rm xbox.db ; git checkout xbox.db"
    	//exec(cmd, (e,so,se)=>{
      		console.log("[Xbox] Fresh Update of the xbox database")
		self.sendSocketNotification("UPDATED", payload)
    	//})
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SCAN') {
	    var self = this;
	    if (payload) {
		this.config = payload;
		this.updateDB(true);
	    }

	    if (this.config.debug) console.log("[Xbox] Collecting devices informations ...");
	    this.xbox_Status(this.config.ip);

            setTimeout(() => {
		var newgame = false
		var newname = false
		this.XBOX.ip = this.config.ip;
		this.XBOX.display = this.config.display;
		this.XBOX.liveid = this.config.liveID
		for ( var nb in this.XBOX_db ) { // search title app in xbox db
			if(this.XBOX_db[nb][0] == this.XBOX.xbname) {
				this.XBOX.name = this.XBOX_db[nb][1]
				this.XBOX.type = this.XBOX_db[nb][2]
				newname = true
				this.actually = this.XBOX.name
			}
		}

		if(!newname && this.XBOX.status && this.XBOX.xbname != null) {
			console.log("[Xbox] Xbox Title !")
			this.XBOX.name = "inconnu"
			this.XBOX.type = null
			this.XBOX.img = null
			newname = false
		}

		if (this.actually != this.lastgame) newgame = true

		if (this.XBOX.type == "app") {
			this.XBOX_idgame = null
			this.XBOX_idcover = null
			this.XBOX_realname = null
			this.XBOX_img = null
		}

		if (newgame && this.XBOX.type == "game" && this.XBOX.name != "inconnu") {
			console.log("[Xbox] Scan IGDB")
			IGDB_game(this.XBOX.name, self.config.igdb_key).then(function(res) {
				for (let [item, value] of Object.entries(res)) {
					self.XBOX_idgame = value.id;
					self.XBOX_idcover = value.cover;
					self.XBOX_realname = value.name;

					IGDB_img(self.XBOX_idgame, self.config.igdb_key).then(function(res) {
						for (let [item, value] of Object.entries(res)) {
							if (self.XBOX_idgame == value.game) self.XBOX_img = "http:" + value.url
							else self.XBOX_img = "error"
						}
					})
				}
			})
		}

            } , 2000);

	    setTimeout(() => {
		this.XBOX.idgame = this.XBOX_idgame
		this.XBOX.idcover = this.XBOX_idcover
		this.XBOX.realname = this.XBOX_realname
		this.XBOX.img = this.XBOX_img
		if (this.XBOX.status && this.config.debug) {
			console.log("[Xbox] " + this.config.display + " (" + this.config.ip + "): " + self.XBOX.status + " -> " + self.XBOX.xbname);
			if (this.XBOX.type == "game" ) console.log("[Xbox] Game: " + this.XBOX.realname + " -idgame: " + this.XBOX.idgame + " -idcover: " + this.XBOX.idcover + " -img: " + this.XBOX.img)
			else console.log("[Xbox] App: " + this.XBOX.name)
			console.log("[Xbox] All informations collected !");
		}
		this.lastgame = this.XBOX.name
		//console.log(this.XBOX)
		self.sendSocketNotification("RESULT", this.XBOX);
	    }, 4000);
        }
	if (notification === 'UpdateDB') {
		//this.updateDB(payload);
	}
	if (notification === 'LOG') console.log("[Xbox] Xbox Database: Please ask update of the title " + payload) 
	if (notification === 'UPDATED_OK') console.log(payload) 
	if (notification === 'DB') {
		this.XBOX_db = payload
	}
    },
});
