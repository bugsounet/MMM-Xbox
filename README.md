# MMM-Xbox

The Xbox SmartGlass For Magic Mirror

## Screenshoot
* Default Style:<br><br>
![](https://github.com/bugsounet/MMM-Xbox/blob/master/screenshoot.jpg)<br>
* Mini Style:<br><br>
![](https://github.com/bugsounet/MMM-Xbox/blob/master/screenshoot2.jpg)

## Installation
```
cd ~/Magicmirror/modules
git clone https://github.com/bugsounet/MMM-Xbox.git
cd MMM-Xbox
npm install
```

## Configuration
```
  {
    module: "MMM-Xbox",
    position: "top_center",
    config: {
		  autohide: false, // auto hide when inactive
		  mini: false, // mini display style
		  debug: false, // debug
		  ip: "", // ip adress of the xbox
		  xboxlivelogin: "", // xbox live login
		  xboxlivepassword: "" // xbox live password
    }
  },
```

## You need to reinstall this module ?
```
cd ~/Magicmirror/modules/MMM-Xbox
npm run clean
npm install
```

Note: The clean script (`npm run clean`) will delete ALL Xbox dependencies

## Setting up the Xbox
The plugin needs to be allowed to connect to your Xbox. To allow this make sure you set the setting to allow anonymous connections in Settings -> Devices -> Connections.

## Notification Sent:
* XBOX_ACTIVE : the console is on-line
* XBOX_INACTIVE : the console is off-line
* XBOX_NAME : Current name Game / Application

## Notification Received:
* XBOX_ON : turn on the console
* XBOX_OFF : turn off the console

## TelegramBot Commands
* /turnon : Wake up the xbox
* /turnoff : Shutdown the xbox

## Change Log

### 2021/02/21
* Fix library (tempory)
* added cleaning script
* Tests: ok (with Xbox One X)

### 2019/11/29
* Rewrite README
* Cleaning Code 
* delete install.sh script and new npm install script for dependencies
* Correct translation Fr/En file 
### 2019/11/28:
* Cleaning Code
* Detect power state still really buggy ... try another script.
* Add Mini display Style
* Autodetect Xbox LiveID and Xbox Name
### 2019/11/27:
* Use Xbox Smartglass Node for check xbox power status, Rest server only when xbox power on
### 2019/11/26:
* Initial Public Beta

## Support and Helping

Support is now on [the 4th Party Modules Forum](http://forum.bugsounet.fr)
