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
	this.lastgame = ""
	this.retry = 0
	//this.messsage = {}
    },

    xbox_device: function () {
	var self = this;

	if (this.retry == 0) console.log("[Xbox] Collecting Xbox informations ...");

	request('http://127.0.0.1:5557/device?addr=192.168.0.39', function (error, response, body) {
                if (error) {
                        return console.error('[Xbox] Device error:', err);
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
	request('http://192.168.0.32:5557/device/' + self.config.liveID + '/connect', function (error, response, body) {
		if (error) {
                        return console.error('[Xbox] Connect error:', err);
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

	request('http://192.168.0.32:5557/device/' + self.config.liveID + '/console_status', function (error, response, body) {
                if (error) {
                        return console.error('[Xbox] Connect error:', error);
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
			self.retry = 0
		} else {
			self.XBOX.status = false;
                        self.XBOX.ip = self.config.ip;
                        self.XBOX.display = self.config.display;
                        self.XBOX.name = null;
                        self.XBOX.type = null;
                        self.XBOX.img = "";
                        self.xbox_send();
			self.retry = 1
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


	request.post({url:'http://localhost:5557/auth/login', formData: loginData }, function optionalCallback(err, httpResponse, body) {
  		if (err) return console.error('[Xbox] Login error:', err);

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
	if (notification === "INIT") {
		var self = this
		this.config = payload;
		const somePath = userHome + '/.local/bin/xbox-rest-server'
		let fileName = path.basename(somePath)
		let filePath = path.dirname(somePath)

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
