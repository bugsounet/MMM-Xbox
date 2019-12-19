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
  },

  notificationReceived: function (notification, payload) {
    if (notification === 'DOM_OBJECTS_CREATED') {
      //DOM creation complete, let's start the module
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
      if (this.Xbox.name && this.LastGameApp != this.Xbox.name) this.sendNotification("XBOX_NAME", this.translate(this.Xbox.name))

      this.LastState = this.Xbox.status
      this.LastGameApp = this.Xbox.name

      if (this.Xbox.name != "") this.Init=false

      this.updateDom()

      if (this.Xbox.status) this.resetCounter()
      else this.Init = true
    }
    if (notification === "ACHIEVEMENT") {
      if (payload) this.Achievement = payload
    }
  },

  getDom: function(){
    var m = document.createElement("div")
    m.id = "XBOX"
    if (this.Xbox.status) m.classList.remove("inactive")
    else if (this.config.autohide) m.classList.add("inactive")

    if (this.config.mini) m.classList.add("mini")

    var back = document.createElement("div")
    back.id = "XBOX_BACKGROUND"
    if (this.Xbox.type == "Game" && this.Xbox.img && !this.config.mini) back.style.backgroundImage = `url(${this.Xbox.img})`
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
      ti.dataset.icon = "mdi:xbox"
      ti.dataset.inline = "false"
      title.appendChild(ti)

      var tt = document.createElement("span")
      tt.className = "text"
      if (this.Init && this.Xbox.status) tt.innerHTML = this.translate("LOADING");

      if (!this.Xbox.status || (!this.Init && !this.Xbox.status)) tt.innerHTML = this.translate("NOTCONNECTED");
      else if (this.Xbox.name) tt.innerHTML = this.translate(this.Xbox.name)

      title.appendChild(tt)

      var device = document.createElement("div")
      device.id = "XBOX_DEVICE"
      var di = document.createElement("span")
      di.className = "iconify"
      if (this.Xbox.display) di.dataset.icon = "mdi:xbox-controller"
      di.dataset.inline = "false"
      device.appendChild(di)
      var dt = document.createElement("span")
      dt.className = "text"
      dt.textContent = this.Xbox.display ? this.Xbox.display : ""
      device.appendChild(dt)

      var achievement = document.createElement("div")
      achievement.id = "XBOX_ACHIEVEMENT"
      if (this.Xbox.type == "Game") {
        var as = document.createElement("span")
        as.className = "iconify"
        as.dataset.icon = "emojione-monotone:letter-g"
        as.dataset.inline = "false"
        achievement.appendChild(as)
        var ast = document.createElement("span")
        ast.className = "text_score"
        ast.textContent = "-/-"
        achievement.appendChild(ast)
        var aa = document.createElement("span")
        aa.style.marginLeft = "20px";
        aa.className = "iconify"
        aa.dataset.icon = "fa-solid:trophy"
        aa.dataset.inline = "false"
        achievement.appendChild(aa)
        var aat = document.createElement("span")
        aat.className = "text_achievement"
        aat.textContent = "-"
        achievement.appendChild(aat)
        var ap = document.createElement("span")
        ap.style.marginLeft = "20px";
        ap.className = "iconify"
        ap.dataset.icon = "vaadin:book-percent"
        ap.dataset.inline = "false"
        achievement.appendChild(ap)
        var apt = document.createElement("span")
        apt.className = "text_progress"
        apt.textContent = "-%"
        achievement.appendChild(apt)
      }

      var time = document.createElement("div")
      time.id = "XBOX_TIME"
      if (this.Xbox.name) {
        var ti = document.createElement("span")
        ti.className = "iconify"
        ti.dataset.icon = "si-glyph:timer"
        ti.dataset.inline ="false"
        time.appendChild(ti)
        var td = document.createElement("span")
        td.className = "text"
        td.textContent = "--:--:--"
        time.appendChild(td)
      }

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
    clearInterval(self.intervalTime);
    self.counterTime = 0

    self.intervalTime = setInterval(function () {
      self.counterTime += 1000;
      if (self.Achievement.name == self.Xbox.name && self.Xbox.type == "Game") { // Achievement update
        var score = document.querySelector("#XBOX_ACHIEVEMENT .text_score")
        score.textContent = self.Achievement.score
        var progress = document.querySelector("#XBOX_ACHIEVEMENT .text_progress")
        progress.textContent = self.Achievement.progress + "%"
        var achievement = document.querySelector("#XBOX_ACHIEVEMENT .text_achievement")
        achievement.textContent = self.Achievement.achievement
      }
      if (self.Xbox.status && !self.Init) {
        var time = document.querySelector("#XBOX_TIME .text") // time uptime
        time.textContent = new Date(self.counterTime).toUTCString().match(/\d{2}:\d{2}:\d{2}/)[0];
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
