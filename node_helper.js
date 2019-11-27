const path = require("path")
var request = require('request');
var NodeHelper = require('node_helper');
var exec = require('child_process').exec
var {PythonShell} = require('python-shell');
const userHome = require('user-home');
var Smartglass = require('xbox-smartglass-core-node');

module.exports = NodeHelper.create({

    start: function() {
        console.log('Démarrage du node_helper pour le module ' + this.name + '...');
	this.XBOX = {
		"ip" : "",
		"display": "",
		"status": false,
		"name" : "",
		"type": "",
		"img": ""
	}
	this.ACHIEVEMENT = {
		"name" : "",
		"score" : "",
		"progress" : "",
		"achievement" : ""
	}
	this.lastgame = ""
	this.xbox_pid = 0
	this.xbox_connected = false
    },

    xbox_check: function () {
	var sgClient = Smartglass()
	var self = this;
	var deviceStatus = { current_app: false, connection_status: false };
	sgClient.connect(self.config.ip).then(function() {
		console.log("[Xbox] Dectected: Xbox On !");
		sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
			deviceStatus.connection_status = true
			if(message.packet_decoded.protected_payload.apps[0] != undefined){
				if(deviceStatus.current_app != message.packet_decoded.protected_payload.apps[0].aum_id){
					self.xbox_connected = true
				}
			} else self.xbox_connected = false
		}.bind(deviceStatus));

		setTimeout(() => {
			if (self.xbox_connected) {
				self.XBOX.status = true
				self.sendSocketNotification("RESULT", self.XBOX); // envoi les infos
				self.rest_server_start();
			}
		} , 4000 )
	}, function(error){
		if (self.xbox_connected) console.log("[Xbox] Dectected: Xbox Off");
		if (self.xbox_pid > 0) {
			console.log("[Xbox] Force Shutdown Xbox SmartGlass Rest Server Pid: " + self.xbox_pid)
			self.rest_server_stop();
		}
		self.xbox_connected = false
		setTimeout(() => { self.xbox_check() } , 10000 )
    	});
    },

    xbox_device: function () {
	var self = this;

	console.log("[Xbox] Collecting Xbox informations ...");

	request.get('http://127.0.0.1:5557/device?addr=' + self.config.ip, {timeout: 5000}, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => {
					if (self.config.debug) console.log("[Xbox] Timeout... Retry Device")
					self.xbox_device();
			} , 2000 )
                        return console.log('[Xbox] Device error:', error);
                }
                message = JSON.parse(body)
		//console.log("device: ", message)

		if(message.success == true) self.xbox_connect();
		else self.xbox_login();
	})
    },

    xbox_connect: function () {
	var self = this;

	console.log("[Xbox] Connecting to Xbox...");
	request.get('http://127.0.0.1:5557/device/' + self.config.liveID + '/connect', {timeout: 5000}, function (error, response, body) {
		if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => {
					if (self.config.debug) console.log("[Xbox] Timeout... Retry Connect")
					self.xbox_device();
			} , 2000 )
                        else return console.log('[Xbox] Connect error:', error);
                }
		message = JSON.parse(body)
		//console.log("connect: ", message)
		if (message.success == true) {
			console.log("[Xbox] Connected to " + self.config.ip + " !")
			self.xbox_status();
		}
		else setTimeout(() => {
			self.xbox_device();
		} , 2000)
	})
    },

    xbox_status: function() {
	var self = this;

	request.get('http://127.0.0.1:5557/device/' + self.config.liveID + '/console_status', {timeout: 5000}, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => { 
					if (self.config.debug) console.log("[Xbox] Timeout... Retry Status")
					self.xbox_device();
			} , 2000 )
                        return console.log('[Xbox] Connect error:', error);
                }
                message = JSON.parse(body)
		//console.log("status: ", message)
		if (message.console_status && message.console_status.active_titles[0] && message.success == true) {
			self.XBOX.status = true;
			self.XBOX.ip = self.config.ip;
			self.XBOX.display = self.config.display;
			self.XBOX.name = message.console_status.active_titles[0].name;
			self.XBOX.type = message.console_status.active_titles[0].type;
			self.XBOX.img = message.console_status.active_titles[0].image;
			self.xbox_send();
			if (self.XBOX.type == "Game") self.xbox_achievement();
		} else {
			self.XBOX.status = false;
                        self.XBOX.ip = self.config.ip;
                        self.XBOX.display = self.config.display;
                        self.XBOX.name = "";
                        self.XBOX.type = "";
                        self.XBOX.img = "";
                        self.xbox_send();
			self.ACHIEVEMENT = {
                		"name" : "",
                		"score" : "",
                		"progress" : "",
				"achievement" : ""
        		}
		}
	})
    },

    xbox_achievement: function() {
	var self = this
	request.get('http://127.0.0.1:5557/web/titlehistory', {timeout: 10000 }, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => { 
						if (self.config.debug) console.log("[Xbox] Timeout... Retry Achievement")
						self.xbox_achievement();
			} , 2000 )
                        return console.log('[Xbox] Connect error:', error);
                }
                message = JSON.parse(body)
		if (message.titles[0]) {
			self.ACHIEVEMENT.name = message.titles[0].name
			self.ACHIEVEMENT.score = message.titles[0].achievement.currentGamerscore + "/" + message.titles[0].achievement.totalGamerscore
                	self.ACHIEVEMENT.progress = message.titles[0].achievement.progressPercentage,
                	self.ACHIEVEMENT.achievement = message.titles[0].achievement.currentAchievements
			//console.log(self.ACHIEVEMENT)
			self.sendSocketNotification("ACHIEVEMENT", self.ACHIEVEMENT);
		}
	})
    },

    xbox_send: function() {
	var self = this
        if ((this.lastgame != this.XBOX.name)) { // envoi les informations seulement si changement de titre
		// debug mode
		if (this.XBOX.status) {
			if (this.config.debug) console.log("[Xbox] " + this.config.display + " (" + this.config.ip + "): " + this.XBOX.status);
			console.log("[Xbox] " + (this.XBOX.type == "Game" ? "Game: " : "App: ") + this.XBOX.name + (this.config.debug ? (" -img: " + this.XBOX.img) : ""))
		}
		self.sendSocketNotification("RESULT", this.XBOX); // envoi les infos
	}

	this.lastgame = this.XBOX.name
	if (this.XBOX.status) this.socketNotificationReceived("UPDATE"); // nouveau scan car la Xbox est en ligne
	else {
		console.log("[Xbox] Connection lost with " + this.config.ip) // connexion perdu ... on redémarre le scan complet
		this.xbox_connected = false
		self.rest_server_stop();
		setTimeout(() => {
			console.log("[Xbox] Waiting for connection...")
			this.xbox_check(); } , 10000 )
	}
    },

    xbox_login: function() {
	var self = this
	console.log("[Xbox] Login to Xbox Live ...");
	var login = false
	var messsage = {}
	var loginData = {
		email: this.config.xboxlivelogin,
		password: this.config.xboxlivepassword
	}

	request.post({url:'http://127.0.0.1:5557/auth/login', formData: loginData }, function optionalCallback(err, httpResponse, body) {
  		if (err) {
			if (err.errno == "ECONNREFUSED") {
				console.log("[Xbox] Connexion to REST server Refused ! Let's retry in a few moment...")
				return setTimeout(() => { self.socketNotificationReceived("LOGIN"); } , 10000)
			}
			return console.log("[Xbox] Login error:", err);
		}

		message = JSON.parse(body)

		if (message.message == "Login success") {
			console.log('[Xbox] Login ' + message.gamertag + ' Success !');
			self.socketNotificationReceived("SCAN");
			self.sendSocketNotification("LOGGED")
		}
		if (message.message == "An account is already signed in.. please logout first") {
			console.log("[Xbox] Login Token Found !")
			self.socketNotificationReceived("SCAN");
			self.sendSocketNotification("LOGGED")
		}
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
		console.log("[Xbox] Console booted !")
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
				console.log("[Xbox] Shutdown succes !")
        		}, function(error) {
                		console.log("[Xbox] Shutdown error: ", error)
			})
		}.bind(sgClient),1000)
	}, function(error){
		console.log("[Xbox] Shutdown error: ", error)
        });
    },

    rest_server_stop: function() {
	var self = this
	exec ("kill -9 " + this.xbox_pid, (err, stdout, stderr)=>{
                if (err == null) {
                        console.log("[Xbox] Shutdown Xbox SmartGlass Rest Server: Ok")
                        self.xbox_pid = 0
			self.xbox_connected = false
		} else {
			console.log("[Xbox] Shutdown Xbox SmartGlass Rest Server: Error -- " + err)
		}
	})
    },

    rest_server_start: function() {
	var self = this
	const RestPath = userHome + '/.local/bin/xbox-rest-server'
        let fileName = path.basename(RestPath)
        let filePath = path.dirname(RestPath)

	console.log("[Xbox] Rest Server Launch...");

        PythonShell.run(fileName, { scriptPath: filePath }, function (err, data) {
        	if (err) return console.log("[Xbox] Xbox SmartGlass Rest Server error: " + err)
	})
	exec ("pgrep -a python3 | grep xbox-rest-server | awk '{print($1)}'", (err, stdout, stderr)=>{
        	if (err == null) {
                	if (stdout.trim()) {
				console.log("[Xbox] Xbox SmartGlass Rest Server : Ok -- Pid:",stdout.trim())
				self.xbox_pid = stdout.trim()
				self.sendSocketNotification("INITIALIZED", true);
			} else {
				console.log("[Xbox] Xbox SmartGlass Rest Server : Error !")
				self.sendSocketNotification("INITIALIZED", false);
			}
		} else {
			console.log("[Xbox] Xbox SmartGlass Rest Server : Check Error !")
			self.sendSocketNotification("INITIALIZED", false);
		}
	})
    },

    socketNotificationReceived: function(notification, payload) {
	if (notification === "INIT") {
		this.config = payload;
		this.xbox_check()
	}

        if (notification === 'LOGIN') {
	    this.xbox_login();
	}

	if (notification === 'SCAN') {
	    this.xbox_device();
        }

	if (notification === 'UPDATE') {
		var self = this
		setTimeout(function(){ self.xbox_status() } , 1000)
	}

	if (notification === 'XBOX_ON') this.xbox_on()
	if (notification === 'XBOX_OFF') this.xbox_off()

    },

});
