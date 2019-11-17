Module.register("MMM-Xbox", {

	defaults: {
		debug: false,
		display: "",
		ip: "",
		liveID: "",
		igdb_key: "",
		autohide: false
	},

  	configAssignment : function (result) {
    		var stack = Array.prototype.slice.call(arguments, 1)
    		var item
   		var key
    		while (stack.length) {
      			item = stack.shift()
      			for (key in item) {
        			if (item.hasOwnProperty(key)) {
          				if (
            					typeof result[key] === "object"
            					&& result[key]
            					&& Object.prototype.toString.call(result[key]) !== "[object Array]"
          				) {
            					if (typeof item[key] === "object" && item[key] !== null) {
              						result[key] = this.configAssignment({}, result[key], item[key])
            					} else {
              						result[key] = item[key]
            					}
          				} else {
            					result[key] = item[key]
          				}
        			}
      			}
    		}
    		return result
  	},

	start: function () {
		this.config = this.configAssignment({}, this.defaults, this.config)
		this.Init = false
		this.XboxDB = {}
		this.Xbox = {}
		this.VersionDB = ""
		this.LastState = false
		this.LastGameApp = ""
	},

	notificationReceived: function (notification, payload) {

        	if (notification === 'DOM_OBJECTS_CREATED') {
            		//DOM creation complete, let's start the module
            		this.sendSocketNotification("SCAN", this.config);
        	}
		if (notification === 'XBOXDB_UPDATE') {
			// demande une nouvelle base de donnée depuis GitHub
			this.sendSocketNotification("UpdateDB", false);
		}
		if (notification === 'XBOX_ON') {
			this.sendSocketNotification("XBOX_ON");
		}
		if (notification === 'XBOX_OFF') {
                        this.sendSocketNotification("XBOX_OFF");
                }
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "RESULT") {
			var self = this
			this.Xbox = payload;

			if (this.LastState != this.Xbox.status) this.sendNotification("XBOX_STATE", this.Xbox.status)
			if (this.Xbox.name && this.LastGameApp != this.Xbox.name) this.sendNotification("XBOX_NAME", this.Xbox.realname ? this.Xbox.realname : this.Xbox.name)

			this.LastState = this.Xbox.status
			this.LastGameApp = this.Xbox.name
			self.updateDom();
			this.resetCounter()
		}
		if (notification === "UPDATED") {
			// Mise a jour effectué -> recharge la nouvelle base de donnée Xbox
			this.XboxDBReload();
			if (payload) this.IntervalScanDB(); // lance une tempo de scan si le payload est sur true
		}
	},

  	getDom: function(){
    		var m = document.createElement("div")
    		m.id = "XBOX"
		if (this.Xbox.status) {
			m.classList.remove("noGame")
			m.classList.remove("inactive")
		} else {
			m.classList.add("noGame")
			if (this.config.autohide) m.classList.add("inactive")
		}

    		var back = document.createElement("div")
    		back.id = "XBOX_BACKGROUND"
		if (this.Xbox.img) back.style.backgroundImage = `url(${this.Xbox.img})`
		else back.style.backgroundImage = ""
    		m.appendChild(back)

    		var fore = document.createElement("div")
    		fore.id = "XBOX_FOREGROUND"

    		var cover = document.createElement("div")
    		cover.id = "XBOX_COVER"

    		var cover_img = document.createElement("img")
    		cover_img.id = "XBOX_COVER_IMAGE"
		if (this.Xbox.img) cover_img.src = this.Xbox.img
    		else cover_img.src = "./modules/MMM-Xbox/resources/xbox.png"

    		cover.appendChild(cover_img)
    		fore.appendChild(cover)

    		var info = document.createElement("div")
    		info.id = "XBOX_INFO"

    		var title = document.createElement("div")
    		title.id = "XBOX_TITLE"

    		var ti = document.createElement("span")
    		ti.className = "iconify"
		if (this.Xbox.type == "game") ti.dataset.icon = "mdi:xbox-controller"
		else ti.dataset.icon = "mdi:xbox"

    		ti.dataset.inline = "false"
    		title.appendChild(ti)

    		var tt = document.createElement("span")
    		tt.className = "text"
		if (this.Xbox.name) {
			if (this.Xbox.type == "game") tt.innerHTML = this.Xbox.realname ? this.Xbox.realname : this.Xbox.name
			else {
				if (this.Xbox.name == "Unkown") tt.innerHTML = this.Xbox.xbname
				else tt.innerHTML = this.translate(this.Xbox.name)
			}
		}
		else tt.innerHTML = this.translate("LOADING");
    		title.appendChild(tt)

    		var device = document.createElement("div")
    		device.id = "XBOX_DEVICE"
    		var di = document.createElement("span")
    		di.className = "iconify"
    		di.dataset.icon = "ic-baseline-devices"
    		di.dataset.inline = "false"
    		device.appendChild(di)
    		var dt = document.createElement("span")
    		dt.className = "text"
		if (this.Xbox.display) dt.textContent = this.Xbox.display
    		else dt.textContent = ""
    		device.appendChild(dt)

    		var time = document.createElement("div")
    		time.id = "XBOX_TIME"
		var ti = document.createElement("span")
		ti.className = "iconify"
		ti.dataset.icon = "si-glyph:timer"
		ti.dataset.inline ="false"
		time.appendChild(ti)
		var td = document.createElement("span")
		td.className = "text"
		td.textContent = "--:--:--"
		time.appendChild(td)

    		info.appendChild(title)
    		info.appendChild(device)
		info.appendChild(time)
    		fore.appendChild(info)

    		m.appendChild(fore)
    		return m
  	},


    	IntervalScanDB: function () {
        	var self = this;
        	clearInterval(self.intervalDB);
        	self.counterDB = 4 * 60 * 60 * 1000 // mise a jour tous les 4 heures

        	self.intervalDB = setInterval(function () {
            		self.counterDB -= 1000;
            		if (self.counterDB <= 0) {
                		clearInterval(self.intervalDB);
                		self.sendSocketNotification("UpdateDB",true);
            		}
        	}, 1000);
    	},

    	resetCounter: function () {
        	var self = this;
        	clearInterval(self.intervalTime);
		self.counterTime = 0;

        	self.intervalTime = setInterval(function () {
            		self.counterTime += 1000;
			var time = document.querySelector("#XBOX_TIME .text")
			time.textContent = new Date(self.counterTime).toUTCString().match(/\d{2}:\d{2}:\d{2}/)[0];
        	}, 1000);
    	},

   	getScripts: function () {
		var iconify= "https://code.iconify.design/1/1.0.0-rc7/iconify.min.js"
    		r = []
		r.push(iconify)
    		return r
	},

	getStyles: function() {
		return ["MMM-Xbox.css"]
    	},

    	XboxDBReload: function () {
        	var self = this;
        	self.XboxDB = {};
        	this.readDB();
    	},

    	readDB: function () {
        	var self = this;
        	var db = "/modules/MMM-Xbox/db/xbox.db"
        	var xmlHttp = new XMLHttpRequest()
        	xmlHttp.onreadystatechange = () => {
            		var res = []
            		if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                		var lines = xmlHttp.responseText.split(/[\r\n]+/)
                		if (lines.length > 0) {
                    			for(var i = 0; i < lines.length; i++) {
                    				var line = lines[i]
                        			if (line != "") {
                        				var a = this.DBToArray(line, ",")
                        				res.push(a[0])
                        			}
                    			}
                    			self.XboxDB = res;
                    			self.VersionDB = self.XboxDB[0][1] + "." + self.XboxDB[0][2]
                    			this.sendSocketNotification("UPDATED", "[Xbox] Title Loaded in Xbox Database : " + (self.XboxDB.length-3) + " -- Version : " + self.VersionDB)
                    			this.sendSocketNotification("DB", self.XboxDB)
                		}
            		}
			if (xmlHttp.status == 404) this.sendSocketNotification("UPDATED", "[Xbox] DB Read Error !")
        	}
        	xmlHttp.open("GET", db, true)
        	xmlHttp.send(null)
    	},

    	DBToArray: function (strData, strDelimiter){
        	strDelimiter = (strDelimiter || ",")
        	var objPattern = new RegExp(
        	(
            	"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            	"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            	"([^\"\\" + strDelimiter + "\\r\\n]*))"
        	), "gi")
        	var arrData = [[]]
        	var arrMatches = null
        	while (arrMatches = objPattern.exec( strData )){
            		var strMatchedDelimiter = arrMatches[ 1 ]
            		if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter) ){
                		arrData.push( [] )
            		}
            		if (arrMatches[ 2 ]){
                		var strMatchedValue = arrMatches[ 2 ].replace(
                		new RegExp( "\"\"", "g" ), "\"" )
            		} else {
                		var strMatchedValue = arrMatches[ 3 ]
            		}
            		arrData[ arrData.length - 1 ].push( strMatchedValue )
        	}
        	return( arrData )
    	},

  	getTranslations: function() {
    		return {
      			fr: "translations/fr.json",
    		}
  	},

/* TelegramBot Commands */

  	getCommands: function () {
    		return [
      			{
        			command: "updatedb",
        			callback: "telegramCommand",
        			description: "Forcer la mise à jour de la base de donnée de MMM-Xbox."
      			},
      			{
				command: "versiondb",
				callback: "telegramCommand",
				description: "Affiche la version de la base de donnée de MMM-Xbox."
      			},
			{	command: "turnon",
				callback: "telegramCommand",
                                description: "Allume la Xbox."
			},
			{       command: "turnoff",
                                callback: "telegramCommand",
                                description: "Eteins la Xbox."
                        },
			/*
			{       command: "launch",
                                callback: "telegramCommand",
                                description: "Lance un jeu ou une application."
                        }
			*/

    	   	]
  	},

  	telegramCommand: function(command, handler) {
    		if (command == "updatedb") {
      			handler.reply("TEXT", "La demande de mise à jour a été envoyé.")
      			this.notificationReceived("XBOXDB_UPDATE", handler.args, "MMM-TelegramBot")
    		}
    		if (command == "versiondb") handler.reply("TEXT", "Base de donnée version : " + this.VersionDB)
		if (command == "turnon") {
                        handler.reply("TEXT", "La commande a été envoyé.")
                        this.notificationReceived("XBOX_ON", handler.args, "MMM-TelegramBot")
		}
		if (command == "turnoff") {
                        handler.reply("TEXT", "La commande a été envoyé.")
                        this.notificationReceived("XBOX_OFF", handler.args, "MMM-TelegramBot")
                }
		/*
		if (command == "launch") {
                        handler.reply("TEXT", "Commande en développement...")
                        this.notificationReceived("XBOX_LAUNCH", handler.args, "MMM-TelegramBot")
                }
		*/
  },

});
