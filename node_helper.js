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
	this.lastgame = ""
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

    updateDB: function(payload) { // fresh update of db
	var self = this;
    	var dir = path.resolve(__dirname, "db")
    	var cmd = "cd " + dir + "; cp xbox.db xbox.db.sav ; rm xbox.db ; wget -q https://raw.githubusercontent.com/bugsounet/MMM-HomeStatus/master/xbox.db"
    	exec(cmd, (e,so,se)=>{
      		console.log("[Xbox] Fresh Update of the xbox database from MMM-HomeStatus GitHub")
		self.sendSocketNotification("UPDATED", payload)
    	})
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SCAN') {
	    var self = this;
	    if (payload) { // first start
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
			}
		}

		if(!newname && this.XBOX.status && this.XBOX.xbname != null) {
			console.log("[Xbox] Unkown Title ! -> " + this.XBOX.xbname)
			this.XBOX.name = "Unkown"
			this.XBOX.type = null
			this.XBOX.img = null
			newname = false
		}

		if (this.lastgame != this.XBOX.name) newgame = true

		if (this.XBOX.type == "app") {
			this.XBOX.idgame = null
			this.XBOX.idcover = null
			this.XBOX.realname = null
			this.XBOX.img = null
		}

		if (newgame && this.XBOX.type == "game" && this.XBOX.name != "Unkown") {
			console.log("[Xbox] IGDB SCAN...")
			IGDB_game(this.XBOX.name, self.config.igdb_key).then(function(res) {
				for (let [item, value] of Object.entries(res)) {
					self.XBOX.idgame = value.id;
					self.XBOX.idcover = value.cover;
					self.XBOX.realname = value.name;

					IGDB_img(self.XBOX.idgame, self.config.igdb_key).then(function(res) {
						for (let [item, value] of Object.entries(res)) {
							if (self.XBOX.idgame == value.game) self.XBOX.img = "http:" + value.url
							else self.XBOX.img = "error"
						}
					})
				}
			})
		}

            } , 2000);

	    setTimeout(() => {
		// debug mode
		if (this.XBOX.status && this.config.debug) {
			console.log("[Xbox] " + this.config.display + " (" + this.config.ip + "): " + this.XBOX.status + (this.XBOX.xbname ? (" -> " + this.XBOX.xbname) : ("")));
			if (this.XBOX.type == "game" ) console.log("[Xbox] Game: " + this.XBOX.realname + " -idgame: " + this.XBOX.idgame + " -idcover: " + this.XBOX.idcover + " -img: " + this.XBOX.img)
			else {
				if (this.XBOX.name) console.log("[Xbox] App: " + this.XBOX.name)
			}
			console.log("[Xbox] All informations collected !");
		}

		if ((this.lastgame != this.XBOX.name)) {
			self.sendSocketNotification("RESULT", this.XBOX); // Envoi les infos si changement de titre
			// Console Log !
			if (this.XBOX.name && this.XBOX.type == "game" && !this.config.debug) console.log("[Xbox] Game: " + (this.XBOX.realname ? this.XBOX.realname : this.XBOX.name))
			else if (this.XBOX.name && !this.config.debug) console.log("[Xbox] App: " + this.XBOX.name)
		}

		this.lastgame = this.XBOX.name
		this.socketNotificationReceived("SCAN"); // Fin du scan ! On Relance le Scan
	    }, 4000);
        }

	if (notification === 'UpdateDB') {
		this.updateDB(payload);
	}

	if (notification === 'UPDATED') console.log(payload)
	if (notification === 'DB') this.XBOX_db = payload
    },
});
