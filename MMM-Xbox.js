Module.register("MMM-Xbox", {

  defaults: {
    mini: false,
    autohide: false,
    debug: false,
    ip: "",
    xboxlivelogin: "",
    xboxlivepassword: "",
    timetologin: 3000
  },

  configAssignment : function (result) {
    var stack = Array.prototype.slice.call(arguments, 1)
    var item
    var key
    while (stack.length) {
      item = stack.shift()
      for (key in item) {
        if (item.hasOwnProperty(key)) {
          if (typeof result[key] === "object" && result[key] && Object.prototype.toString.call(result[key]) !== "[object Array]") {
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
    this.Init = true
    this.Xbox = {}
    this.Achievement = {}
    this.LastState = false
    this.LastGameApp = ""
    this.intervalTime = 0
    this.counterTime = 0
  },

  notificationReceived: function (notification, payload) {
    if (notification === 'DOM_OBJECTS_CREATED') {
      this.sendSocketNotification("INIT", this.config);
  	}
    if (notification === 'XBOX_ON') this.sendSocketNotification("XBOX_ON");
    if (notification === 'XBOX_OFF') this.sendSocketNotification("XBOX_OFF");
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "RESULT") {
      var self = this
      this.Xbox = payload;

      if (this.LastState != this.Xbox.status) this.sendNotification(this.Xbox.status ? "XBOX_ACTIVE" : "XBOX_INACTIVE")
      if (this.Xbox.name && this.LastGameApp != this.Xbox.name) {
        this.sendNotification("XBOX_NAME", this.translate(this.Xbox.name))
        this.resetCounter()
        this.doCounter()
      }
      else {
        this.resetCounter()
        this.Init=true
      }
      this.LastState = this.Xbox.status
      this.LastGameApp = this.Xbox.name

      this.updateResult()

      if (!this.Xbox.name) this.Init=false

    }
    if (notification === "ACHIEVEMENT") {
      if (payload) {
        this.Achievement = payload
        this.updateAchievement()
      }
    }
  },

  updateAchievement: function() {
	var score = document.getElementById("XBOX_ACHIEVEMENT_SCORE")
	var progress = document.getElementById("XBOX_ACHIEVEMENT_PROGRESS")
	var achievement = document.getElementById("XBOX_ACHIEVEMENT_ACHIEVEMENT")

    if (this.Achievement.name == this.Xbox.name && this.Xbox.type == "Game") { // Achievement update
      score.textContent = this.Achievement.score
      progress.textContent = this.Achievement.progress + "%"
      achievement.textContent = this.Achievement.achievement
    }
    else {
      score.textContent = "-/-"
      progress.textContent = "-%"
      achievement.textContent = "-"
    }
  },

  updateResult: function() {
	var xbox = document.getElementById("XBOX")
	var back = document.getElementById("XBOX_BACKGROUND")
	var cover_img = document.getElementById("XBOX_COVER_IMAGE")
	var tt = document.getElementById("XBOX_TITLE_NAME")
	var di = document.getElementById("XBOX_DEVICE_ICON")
	var dt = document.getElementById("XBOX_DEVICE_NAME")
	var ti = document.getElementById("XBOX_TIME")
	var ac = document.getElementById("XBOX_ACHIEVEMENT")

	if (this.Xbox.status) xbox.classList.remove("inactive")
    else if (this.config.autohide) xbox.classList.add("inactive")

	if (this.Xbox.type == "Game" && this.Xbox.img && !this.config.mini) back.style.backgroundImage = `url(${this.Xbox.img})`
    else back.style.backgroundImage = ""

    if (this.Xbox.img) cover_img.src = this.Xbox.img
    else cover_img.src = "./modules/MMM-Xbox/resources/xbox.png"

    if (this.Init && this.Xbox.status) tt.innerHTML = this.translate("LOADING");
    if (!this.Xbox.status || (!this.Init && !this.Xbox.status)) tt.innerHTML = this.translate("NOTCONNECTED");
    else if (this.Xbox.name) tt.innerHTML = this.translate(this.Xbox.name)

    di.dataset.icon = this.Xbox.display ? "mdi:xbox-controller" : ""
    dt.textContent = this.Xbox.display ? this.Xbox.display : ""

    if (!this.Xbox.name) ti.classList.add("hidden")
    else ti.classList.remove("hidden")

    if (this.Xbox.type == "Game") ac.classList.remove("hidden")
    else ac.classList.add("hidden")
  },

  getDom: function(){
    var m = document.createElement("div")
    m.id = "XBOX"
    if (this.config.autohide) m.classList.add("inactive")

    if (this.config.mini) m.classList.add("mini")

    var back = document.createElement("div")
    back.id = "XBOX_BACKGROUND"
    back.style.backgroundImage = ""
    m.appendChild(back)

    var fore = document.createElement("div")
    fore.id = "XBOX_FOREGROUND"

    var cover = document.createElement("div")
    cover.id = "XBOX_COVER"

    var cover_img = document.createElement("img")
    cover_img.id = "XBOX_COVER_IMAGE"
    cover_img.src = "./modules/MMM-Xbox/resources/xbox.png"

    cover.appendChild(cover_img)
    fore.appendChild(cover)

    var info = document.createElement("div")
    info.id = "XBOX_INFO"

    var title = document.createElement("div")
    title.id = "XBOX_TITLE"
    var ti = document.createElement("div")
    ti.id = "XBOX_TITLE_ICON"
    ti.className = "iconify"
    ti.dataset.icon = "mdi:xbox"
    ti.dataset.inline = "false"
    title.appendChild(ti)

    var tt = document.createElement("div")
    tt.id = "XBOX_TITLE_NAME"
    tt.className = "name"

    tt.innerHTML = this.translate("NOTCONNECTED");

    title.appendChild(tt)

    var device = document.createElement("div")
    device.id = "XBOX_DEVICE"
    var di = document.createElement("div")
    di.id = "XBOX_DEVICE_ICON"
    di.className = "iconify"
    di.dataset.inline = "false"
    device.appendChild(di)
    var dt = document.createElement("div")
    dt.id = "XBOX_DEVICE_NAME"
    dt.className = "text"
    dt.textContent = ""
    device.appendChild(dt)

    var achievement = document.createElement("div")
    achievement.id = "XBOX_ACHIEVEMENT"
    achievement.classList.add("hidden")
    var as = document.createElement("div")
    as.id = "XBOX_ACHIEVEMENT_ICON1"
    as.className = "iconify"
    as.dataset.icon = "emojione-monotone:letter-g"
    as.dataset.inline = "false"
    achievement.appendChild(as)
    var ast = document.createElement("div")
    ast.id = "XBOX_ACHIEVEMENT_SCORE"
    ast.className = "text"
    ast.textContent = "-/-"
    achievement.appendChild(ast)
    var aa = document.createElement("div")
    aa.id = "XBOX_ACHIEVEMENT_ICON2"
    aa.style.marginLeft = "10px";
    aa.className = "iconify"
    aa.dataset.icon = "fa-solid:trophy"
    aa.dataset.inline = "false"
    achievement.appendChild(aa)
    var aat = document.createElement("div")
    aat.id = "XBOX_ACHIEVEMENT_ACHIEVEMENT"
    aat.className = "text"
    aat.textContent = "-"
    achievement.appendChild(aat)
    var ap = document.createElement("div")
    ap.id = "XBOX_ACHIEVEMENT_ICON3"
    ap.style.marginLeft = "10px";
    ap.className = "iconify"
    ap.dataset.icon = "vaadin:book-percent"
    ap.dataset.inline = "false"
    achievement.appendChild(ap)
    var apt = document.createElement("div")
    apt.id = "XBOX_ACHIEVEMENT_PROGRESS"
    apt.className = "text"
    apt.textContent = "-%"
    achievement.appendChild(apt)

    var time = document.createElement("div")
    time.id = "XBOX_TIME"
    time.classList.add("hidden")
    var ti = document.createElement("div")
    ti.id = "XBOX_TIME_ICON"
    ti.className = "iconify"
    ti.dataset.icon = "si-glyph:timer"
    ti.dataset.inline ="false"
    time.appendChild(ti)
    var td = document.createElement("div")
    td.id = "XBOX_TIME_TEXT"
    td.className = "text"
    td.textContent = "--:--:--"
    time.appendChild(td)

    info.appendChild(title)
    info.appendChild(device)
    info.appendChild(achievement)
    info.appendChild(time)
    fore.appendChild(info)

    m.appendChild(fore)
    return m
  },

  resetCounter: function () {
    var self = this;
    var time = document.getElementById("XBOX_TIME_TEXT")
    clearInterval(this.intervalTime);
    this.counterTime = 0
    time.textContent = "--:--:--"
  },
  doCounter: function() {
	var self = this;
    var time = document.getElementById("XBOX_TIME_TEXT")
    this.intervalTime = setInterval(function () {
      self.counterTime += 1000;
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

  getTranslations: function() {
    return {
      en: "translations/en.json",
      fr: "translations/fr.json"
    }
  },

/* TelegramBot Commands */

  getCommands: function () {
    return [
      {
        command: "turnon",
        callback: "telegramCommand",
        description: this.translate("TBTurnon")
      },
      {
        command: "turnoff",
        callback: "telegramCommand",
        description: this.translate("TBTurnoff")
      },
    ]
  },

  telegramCommand: function(command, handler) {
    if (command == "turnon") {
      if (this.Xbox.display == "") handler.reply("TEXT", this.translate("RTBTurnError"))
      else {
        handler.reply("TEXT", this.translate("RTBTurn"))
        this.notificationReceived("XBOX_ON", handler.args, "MMM-TelegramBot")
      }
    }
    if (command == "turnoff") {
      handler.reply("TEXT", this.translate("RTBTurn"))
      this.notificationReceived("XBOX_OFF", handler.args, "MMM-TelegramBot")
    }
  },
});
