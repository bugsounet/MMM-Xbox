const path = require("path")
var request = require('request');
var NodeHelper = require('node_helper');
var exec = require('child_process').exec
var {PythonShell} = require('python-shell');
const userHome = require('user-home');
var Smartglass = require('xbox-smartglass-core-node');

module.exports = NodeHelper.create({

  start: function() {
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
    this.checked = 0
    this.liveid = ""
    this.display = ""
  },

  xbox_main: function() {
    this.xbox_check()
    if (this.XBOX.status) this.rest_server_start();
    else setTimeout(() => { this.xbox_main() } , 3000 )
  },

  xbox_check: function () {
    var sgClient = Smartglass()
    var self = this;
    sgClient.connect(this.config.ip).then(function() {
      if (self.config.debug) console.log("[Xbox] Check Xbox Really On:  " + self.checked + "/2");
      if (self.checked == 2) {
        console.log("[Xbox] Dectected: Xbox On !");
        self.checked = 0
        self.XBOX.status = true
        self.sendSocketNotification("RESULT", self.XBOX);
      }
      else self.checked += 1
    }, function(){
      if (self.config.debug) console.log("[Xbox] Not Connected")
      self.checked = 0
      self.XBOX.status = false
      self.sendSocketNotification("RESULT", self.XBOX);
    });
  },

  xbox_device: function () {
    var self = this;

    console.log("[Xbox] Collecting Xbox informations ...");
    request.get('http://127.0.0.1:5557/device?addr=' + this.config.ip, {timeout: 5000}, function (error, response, body) {
      if (error) {
        console.log("[Xbox] Device: " + error);
        return self.xbox_close()
      }

      message = JSON.parse(body)

      if(message.success == true) {
        if (Object.keys(message.devices).length > 0) {
          for (let [item, value] of Object.entries(message.devices)) {
            self.liveid = item
            console.log("[Xbox] Xbox LiveID: " +item)
            self.display = value.name
            console.log("[Xbox] Xbox Name: " + value.name)
            self.XBOX.display= self.display
            self.XBOX.status = true
            self.sendSocketNotification("RESULT", self.XBOX); // envoi les infos
          }
        }
        self.xbox_connect();
      }
      else {
        console.log("[Xbox] No Device informations ! Restarting...")
        self.xbox_close();
      }
    })
  },

  xbox_connect: function () {
    var self = this;

    console.log("[Xbox] Connecting to " + self.display + " (" + self.config.ip + ")")
    request.get('http://127.0.0.1:5557/device/' + self.liveid + '/connect', {timeout: 5000}, function (error, response, body) {
      if (error) {
        console.log("[Xbox] Connect: " + error);
		return self.xbox_close()
      }

       message = JSON.parse(body)

      if (message.success == true) {
        console.log("[Xbox] Connected to SmartGlass !")
        self.xbox_status();
      }
      else {
        console.log("[Xbox] Not Connected to SmartGlass ! Restarting...")
        self.xbox_close();
      }
    })
  },

  xbox_status: function() {
    var self = this;

    request.get('http://127.0.0.1:5557/device/' + this.liveid + '/console_status', {timeout: 5000}, function (error, response, body) {
      if (error) {
        console.log("[Xbox] Status: " + error);
		return self.xbox_close()
      }

      message = JSON.parse(body)

      if (message.console_status && message.console_status.active_titles[0] && message.success == true) {
        self.XBOX.status = true;
        self.XBOX.ip = self.config.ip;
        self.XBOX.display = self.display;
        self.XBOX.name = message.console_status.active_titles[0].name;
        self.XBOX.type = message.console_status.active_titles[0].type;
        self.XBOX.img = message.console_status.active_titles[0].image;
        self.xbox_send();
        if (self.XBOX.type == "Game") self.xbox_achievement();
      } else {
        self.XBOX.status = false;
        self.XBOX.ip = self.config.ip;
        self.XBOX.display = self.display;
        self.XBOX.name = "";
        self.XBOX.type = "";
        self.XBOX.img = "";
        self.ACHIEVEMENT = {
          "name" : "",
          "score" : "",
          "progress" : "",
          "achievement" : ""
        }
        self.xbox_send();
      }
    })
  },

  xbox_achievement: function() {
    var self = this
    request.get('http://127.0.0.1:5557/web/titlehistory', {timeout: 10000 }, function (error, response, body) {
      if (error) return console.log("[Xbox] Achievement: " + error); // retournera les infos au prochain essai

      message = JSON.parse(body)
      if (message.titles[0]) {
        self.ACHIEVEMENT.name = message.titles[0].name
        self.ACHIEVEMENT.score = message.titles[0].achievement.currentGamerscore + "/" + message.titles[0].achievement.totalGamerscore
        self.ACHIEVEMENT.progress = message.titles[0].achievement.progressPercentage,
        self.ACHIEVEMENT.achievement = message.titles[0].achievement.currentAchievements

        self.sendSocketNotification("ACHIEVEMENT", self.ACHIEVEMENT);
      }
    })
  },

  xbox_send: function() {
    if ((this.lastgame != this.XBOX.name)) { // envoi les informations seulement si changement de titre

      if (this.XBOX.status) {
        if (this.config.debug) console.log("[Xbox] " + this.display + " (" + this.config.ip + "): " + this.XBOX.status);
        console.log("[Xbox] " + (this.XBOX.type == "Game" ? "Game: " : "App: ") + this.XBOX.name)
        if (this.config.debug) console.log("[Xbox] Img: " + this.XBOX.img)
      }
      this.sendSocketNotification("RESULT", this.XBOX); // envoi les infos
	}

    this.lastgame = this.XBOX.name
    if (this.XBOX.status) setTimeout(() => { this.xbox_status() } , 1000) // nouveau scan car la Xbox est en ligne
    else {
      console.log("[Xbox] Connection lost with " + this.display + " (" + this.config.ip + ")") // connexion perdu ...
      this.xbox_close()
    }
  },

  xbox_close: function() {
    this.rest_server_stop(); // stop le Rest server
    this.XBOX = {
      "ip" : "",
      "display": this.display,
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
    this.checked = 0
    this.liveid = ""

    this.sendSocketNotification("RESULT", this.XBOX);
    setTimeout(() => { // attend 30 sec (delai pour le reboot) et relance le main
      console.log("[Xbox] Waiting for new connection...")
      this.xbox_main();
    },30000)
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
          setTimeout(() => { self.xbox_login() } , self.config.timetologin)
          return
        }
        return console.log("[Xbox] Login unkown error: ", err);
      }

      message = JSON.parse(body)
      if (message.message == "Login success") {
        console.log('[Xbox] Login ' + message.gamertag + ' Success !');
        return self.xbox_device();
      }
      if (message.message == "An account is already signed in.. please logout first") {
        console.log("[Xbox] Login Token Found !")
        return self.xbox_device();
      }
      console.log("[Xbox] Unkown login messsage: " + message.message) // si message inconnu ?
    })
  },

  xbox_on: function() {
    var self = this
    console.log("[Xbox] Request to start the xbox (" + self.config.ip + ")")

    Smartglass().powerOn({ live_id : this.liveid, tries: 5, ip : this.config.ip }).then(function (res) {
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
      } else {
        console.log("[Xbox] Shutdown Xbox SmartGlass Rest Server: " + err)
      }
    })
  },

  rest_server_start: function() {
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
          this.xbox_pid = stdout.trim()
          this.xbox_login()
        } else {
          console.log("[Xbox] Xbox SmartGlass Rest Server : Error !")
        }
      } else {
        console.log("[Xbox] Xbox SmartGlass Rest Server : Check Error !")
      }
	})
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "INIT") {
      this.config = payload;
      this.xbox_main()
    }
    if (notification === 'XBOX_ON') this.xbox_on()
    if (notification === 'XBOX_OFF') this.xbox_off()
  },
});
