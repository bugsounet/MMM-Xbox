const path = require("path")
var request = require('request');
var NodeHelper = require('node_helper');
var exec = require('child_process').exec
var {PythonShell} = require('python-shell');
const userHome = require('user-home');

module.exports = NodeHelper.create({

    start: function() {
        console.log('Démarrage du node_helper pour le module ' + this.name + '...');
	this.XBOX = {
		"ip" : "",
		"display": "",
		"status": false,
		"name" : null,
		"type": null,
		"img": ""
	}
	this.ACHIEVEMENT = {
		"name" : "",
		"score" : "",
		"progress" : "",
		"achievement" : ""
	}
	this.lastgame = ""
	this.retry = 0
    },

    xbox_device: function () {
	var self = this;

	if (this.retry == 0) console.log("[Xbox] Collecting Xbox informations ...");

	request.get('http://127.0.0.1:5557/device?addr=' + self.config.ip, {timeout: 5000}, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => {
					console.log("[Xbox] Timeout... Retry Device")
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

	if (this.retry == 0) console.log("[Xbox] Connecting to Xbox...");
	request.get('http://127.0.0.1:5557/device/' + self.config.liveID + '/connect', {timeout: 5000}, function (error, response, body) {
		if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => {
					console.log("[Xbox] Timeout... Retry Connect")
					self.retry = 1;
					self.xbox_device();
			} , 2000 )
                        else return console.log('[Xbox] Connect error:', error);
                }
		message = JSON.parse(body)
		//console.log("connect: ", message)
		if (message.success == true) {
			if (self.retry == 0) console.log("[Xbox] Connected to " + self.config.ip + " !")
			self.xbox_status();
		}
		else setTimeout(() => {
			self.retry = 1
			self.xbox_device();
		} , 2000)
	})
    },

    xbox_status: function() {
	var self = this;

	request.get('http://127.0.0.1:5557/device/' + self.config.liveID + '/console_status', {timeout: 5000}, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => { 
					console.log("[Xbox] Timeout... Retry Status")
					self.retry = 1;
					self.xbox_device();
			} , 2000 )
                        return console.log('[Xbox] Connect error:', error);
                }
                message = JSON.parse(body)
		//console.log("status: ", message)
		if (message.console_status.active_titles[0] && message.success == true) {
			if (self.retry == 1) console.log("[Xbox] Reconnected to " + self.config.ip + " !")
			self.XBOX.status = true;
			self.XBOX.ip = self.config.ip;
			self.XBOX.display = self.config.display;
			self.XBOX.name = message.console_status.active_titles[0].name;
			self.XBOX.type = message.console_status.active_titles[0].type;
			self.XBOX.img = message.console_status.active_titles[0].image;
			self.xbox_send();
			if (self.XBOX.type == "Game") self.xbox_achievement();
			self.retry = 0
		} else {
			self.XBOX.status = false;
                        self.XBOX.ip = self.config.ip;
                        self.XBOX.display = self.config.display;
                        self.XBOX.name = null;
                        self.XBOX.type = null;
                        self.XBOX.img = "";
                        self.xbox_send();
			self.ACHIEVEMENT = {
                		"name" : "",
                		"score" : "",
                		"progress" : "",
				"achievement" : ""
        		}
			self.retry = 1
		}
	})
    },

    xbox_achievement: function() {
	var self = this
	request.get('http://127.0.0.1:5557/web/titlehistory', {timeout: 5000 }, function (error, response, body) {
                if (error) {
			if (error.code == "ESOCKETTIMEDOUT") return setTimeout(() => { 
						console.log("[Xbox] Timeout... Retry Achievement")
						xbox_achievement();
			} , 2000 )
                        return console.log('[Xbox] Connect error:', error);
                }
                message = JSON.parse(body)
		self.ACHIEVEMENT.name = message.titles[0].name
		self.ACHIEVEMENT.score = message.titles[0].achievement.currentGamerscore + "/" + message.titles[0].achievement.totalGamerscore
                self.ACHIEVEMENT.progress = message.titles[0].achievement.progressPercentage,
                self.ACHIEVEMENT.achievement = message.titles[0].achievement.currentAchievements
		//console.log(self.ACHIEVEMENT)
		self.sendSocketNotification("ACHIEVEMENT", self.ACHIEVEMENT);
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
		if (this.retry == 0) console.log("[Xbox] Connection lost with " + this.config.ip) // connexion perdu ... on redémarre le scan complet
		this.retry = 1
		this.xbox_device();
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
			return console.log('[Xbox] Login error:', err);
		}

		message = JSON.parse(body)

		if (message.message == "Login success") {
			console.log('[Xbox] Login ' + message.gamertag + ' Success !');
			self.socketNotificationReceived("SCAN");
		}
		if (message.message == "An account is already signed in.. please logout first") {
			console.log("[Xbox] Login Token Found !")
			self.socketNotificationReceived("SCAN");
		}
	})
    },

    xbox_on: function() {
	var self = this
	console.log("[Xbox] Request to start the xbox (" + self.config.ip + ")")
	// to do :)
    },

    xbox_off: function() {
        var self = this
        console.log("[Xbox] Request to shutdown the xbox (" + self.config.ip + ")")
	// to do !
    },

    socketNotificationReceived: function(notification, payload) {
	if (notification === "INIT") {
		var self = this
		this.config = payload;
		const RestPath = userHome + '/.local/bin/xbox-rest-server'
		let fileName = path.basename(RestPath)
		let filePath = path.dirname(RestPath)

		console.log("[Xbox] Rest Server Launch...");

		PythonShell.run(fileName, { scriptPath: filePath }, function (err, data) {
                        if (err) console.log("[Xbox] Xbox SmartGlass Rest Server " + err)
		})

		exec ("pgrep -a python3 | grep xbox-rest-server | awk '{print($1)}'", (err, stdout, stderr)=>{
			if (err == null) {
				if (stdout.trim()) {
					console.log("[Xbox] Xbox SmartGlass Rest Server : Ok -- Pid:",stdout.trim())
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
