Module.register("MMM-Xbox", {

	defaults: {
		delay: 10 * 1000,
		debug: false,
		display: "",
		ip: "",
		liveID: "",
		igdb_key: ""
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
	},

	notificationReceived: function (notification, payload) {

        	if (notification === 'DOM_OBJECTS_CREATED') {
            		//DOM creation complete, let's start the module
            		this.sendSocketNotification("SCAN", this.config);
        	}
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "RESULT") {
			this.Xbox = payload;
			if (this.LastState != this.Xbox.status) this.sendNotification("XBOX_STATE", this.Xbox.status)
			this.LastState = this.Xbox.status
			this.IntervalScanDevice();
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
			m.classList.add("inactive")
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
		if (this.Xbox.img) {
			var str = this.Xbox.img
			var res = str.replace("thumb", "cover_big");
			cover_img.src = res
		}
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
		if (this.Xbox.name) tt.innerHTML = this.Xbox.realname ? this.Xbox.realname : this.Xbox.name
    		//else tt.textContent = this.translate("LOADING");
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
		if(this.Xbox.display) dt.textContent = this.Xbox.display
    		else dt.textContent = ""
    		device.appendChild(dt)

    		info.appendChild(title)
    		info.appendChild(device)
    		fore.appendChild(info)

    		m.appendChild(fore)
    		return m
  	},


    	IntervalScanDevice: function () {
        	var self = this;
		//this.updateGame(self.Xbox.img);
		clearInterval(self.interval);
		self.counter = this.config.delay;
		self.updateDom();

		self.interval = setInterval(function () {
            		self.counter -= 1000;
            		if (self.counter <= 0) {
				clearInterval(self.interval);
				self.sendSocketNotification("SCAN", false);
            		}
        	}, 1000);
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
                    			this.sendSocketNotification("UPDATED_OK", "[Xbox] Title Loaded in Xbox Database : " + (self.XboxDB.length-1) + " -- Version : " + self.VersionDB)
                    			this.sendSocketNotification("DB", self.XboxDB)
                		}
            		}
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

});
