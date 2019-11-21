# MMM-Xbox

## Under development...

* ~~Use MMM-HomeStatus xbox.db database : ok~~
* Use SmartGlass Rest Server : ok
* Show cover of the current game on Xbox: ok
* Translation if app : ok (default: English)
* Multi Translation : nok (only French ... need help)
* Show current game (or app) play time : ok
* Command start and stop Xbox : nok -> need to rewrite with Rest Server
* Notification Xbox Active / inactive to other modules: ok
* Notification New Game to other modules : not tested
* Hide module when inactive : ok (option)
* TelegramBot Commands : ok -> need to rewrite with Rest Server
* Translate Telegram Commands : not yet implented just only French reply
* ~~Auto update Xbox Database from MMM-HomeStatus module : ok (every 4 hours or force by TelegramBot)~~
* Launch Game by TelegramBot or notification : not yet implented

## Dev Screenshoot
![](https://github.com/bugsounet/MMM-Xbox/blob/master/screenshot.jpg)

## Installation (for testing)
```
cd ~/Magicmirror/modules
git clone https://github.com/bugsounet/MMM-Xbox.git
./install.sh
```

## Config
```
  {
    module: "MMM-Xbox",
    position: "top_center",
    config: {
		  autohide: false, //auto hide when inactive
		  debug: false, // debug
		  display: "", // xbox name to diplay on the mirror
		  ip: "", // ip adress of the xbox
		  liveID: "", // LiveID console
		  xboxlivelogin: "", xbox live login
		  xboxlivepassword: "", xbox live password
  },
```

## Known Bug:
* Connexion lost when you force to reboot xbox
* Check if token is expired to relogin
