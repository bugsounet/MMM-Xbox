# MMM-Xbox

## Development Status...

* Use SmartGlass Rest Server : ok
* Show cover of the current game on Xbox: ok
* Translation if Application : ok
* Multi Translation : ok (only English and French ... need help)
* Show current game (or app) play time : ok
* Display Achievements : ok
* Command start and stop Xbox : ok
* Notification Received or start and stop Xbox : ok
* Notification Xbox Active / Inactive to other modules: ok
* Notification New Game to other modules : implented but not tested
* Hide module when inactive : ok (option)
* TelegramBot Commands : ok (start & stop xbox)
* Translate Reply Telegram Commands : not yet implented -- just only French reply
* Launch Game by TelegramBot or notification : not yet implented

## Dev Screenshoot
![](https://github.com/bugsounet/MMM-Xbox/blob/master/screenshoot.jpg)

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
* ~~Connexion lost when you force to reboot xbox~~
* Check if token is expired to relogin
