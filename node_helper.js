const path = require("path")
var request = require('request');
var NodeHelper = require('node_helper');
var ping = require('ping');
var Smartglass = require('xbox-smartglass-core-node');
var exec = require('child_process').exec
const igdb = require('igdb-api-node').default;
//const date = require('date-and-time');


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

    xbox_status: function (ip) {
	var sgClient = Smartglass()
	var self = this;
	var deviceStatus = { current_app: false, connection_status: false };

	if (this.config.debug) console.log("[Xbox] Collecting Xbox informations ...");

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

		if (this.lastgame != this.XBOX.name) newgame = true

		if(!newname && this.XBOX.status && this.XBOX.xbname != null) {
			if (this.XBOX.name != "Unkown") console.log("[Xbox] Unkown Title ! -> " + this.XBOX.xbname)
			this.XBOX.name = "Unkown"
			this.XBOX.type = null
			this.XBOX.img = null
		}

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
							var url = ""
							if (self.XBOX.idgame == value.game) {
								url = "http:" + value.url
								var res = url.replace("thumb", "cover_big");
                        					self.XBOX.img = res
							} else {
								console.log ("[Xbox] Cover error !") 
								self.XBOX.img = ""
							}
						}
					})
				}
			})
		}

	} , 2000);
    },

    xbox_send: function() {
	var self = this
        if ((this.lastgame != this.XBOX.name)) { // envoi les informations seulement si changement de titre
		// debug mode
		if (this.XBOX.status && this.config.debug) {
			console.log("[Xbox] " + this.config.display + " (" + this.config.ip + "): " + this.XBOX.status + (this.XBOX.xbname ? (" -> " + this.XBOX.xbname) : ("")));
			if (this.XBOX.type == "game" ) console.log("[Xbox] Game: " + this.XBOX.realname + " -idgame: " + this.XBOX.idgame + " -idcover: " + this.XBOX.idcover + " -img: " + this.XBOX.img)
			else {
				if (this.XBOX.name != "Unkown") console.log("[Xbox] App: " + this.XBOX.name)
			}
		}

		self.sendSocketNotification("RESULT", this.XBOX); // envoi les infos
		// Console Log !
		if (this.XBOX.name && this.XBOX.type == "game" && !this.config.debug) console.log("[Xbox] Game: " + (this.XBOX.realname ? this.XBOX.realname : this.XBOX.name))
		else if (this.XBOX.name && !this.config.debug && this.XBOX.type) console.log("[Xbox] App: " + this.XBOX.name)
	}

	this.lastgame = this.XBOX.name
	this.socketNotificationReceived("SCAN"); // Fin du scan ! On Relance le Scan
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

    xbox_on: function() {
	var self = this
	console.log("[Xbox] Request to start the xbox (" + self.config.ip + ")")
	Smartglass().powerOn({
		live_id : self.config.liveID,
		tries: 5,
		ip : self.config.ip
	}).then(function (res) {
		console.log("[Xbox] Console booted: ", res)
	}, function(error) {
		console.log("[Xbox] Booting console failed: ", error)
	});
    },

    xbox_off: function() {
        var self = this
	var sgClient = Smartglass()

        console.log("[Xbox] Request to shutdown the xbox (" + self.config.ip + ")")
        sgClient.connect(self.config.ip).then(function () {
                setTimeout(function(){
			sgClient.powerOff().then(function(status){
				console.log("[Xbox] Shutdown succes!")
        		}, function(error) {
                		console.log("[Xbox] Shutdown error: ", error)
			})
		}.bind(sgClient),1000)
	}, function(error){
		console.log("[Xbox] Shutdown error: ", error)
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SCAN') {
	    var self = this;
	    if (payload) { // first start
		this.config = payload;
		this.updateDB(true);
	    }

	    if (this.config.debug) console.log("[Xbox] Collecting Xbox informations ...");
	    this.xbox_status(this.config.ip);

	    setTimeout(() => { this.xbox_send(); }, 4000);
        }

	if (notification === 'UpdateDB') {
		this.updateDB(payload);
	}
	if (notification === 'UPDATED') console.log(payload)
	if (notification === 'DB') {
		this.XBOX_db = payload


	}
	if (notification === 'XBOX_ON') this.xbox_on()
	if (notification === 'XBOX_OFF') this.xbox_off()

    },

/*
    xbox_writedb: function() {
	// test recontruction DB : ok to console
	// Xbox Title Code , MMM-Xbox game/app name , type (game or app), igdb cover link ? , igdb saved cover (cache) ?
	// humm... integrate igdb link and cover ?
	// choise of :
	// 1 -- Make Personnal Database
	// 2 -- autoupdate DB via github

	// * -> make a node js script to write new db
	// * -> if i code igdb cover link and cache --> gain of a little delay to information display

	const now = new Date();
	var test = "Version," + date.format(now, 'YYYYMMDD') + "," + date.format(now, 'HHMM') + "\n"
	for ( var nb in this.XBOX_db ) {
		if (nb > 0) {
			if (this.XBOX_db[nb][0]) {
				if (this.XBOX_db[nb][0] == "#Games" || this.XBOX_db[nb][0] == "#Apps") test += "\n"
				test += this.XBOX_db[nb][0]
			}
			if (typeof this.XBOX_db[nb][1] != "undefined") test += "," + this.XBOX_db[nb][1]
			if (typeof this.XBOX_db[nb][2] != "undefined") test += "," + this.XBOX_db[nb][2]
			if (typeof this.XBOX_db[nb][3] != "undefined") test += "," + this.XBOX_db[nb][3] // covers link ?
			if (typeof this.XBOX_db[nb][4] != "undefined") test += "," + this.XBOX_db[nb][4] // covers cache ?
			test += "\n"
		}
	}
	console.log(test)
    },
*/

});
