#!/bin/bash

function command_exists () { type "$1" &> /dev/null ;}

echo -e "\e[96mInstalling MMM-Xbox dependencies ...\e[90m"

# Update before first apt-get
echo -e "\e[96mUpdating packages ...\e[90m"
sudo apt-get update || echo -e "\e[91mUpdate failed, carrying on installation ...\e[90m"

# Check if we need to install python3-pip.
echo -e "\e[96mCheck current pip3 installation ...\e[0m"
PIP_INSTALL=false
if command_exists pip3; then
	echo -e "\e[0mpip3 currently installed.";
else
	echo -e "\e[93mpip3 is not installed.\e[0m";
	PIP_INSTALL=true
fi

# Install pip3 if necessary.
if $PIP_INSTALL; then
	echo -e "\e[96mInstalling python3-pip ...\e[90m"
	sudo apt-get install -y python3-pip || exit
	echo -e "\e[92mpython3-pip installation Done!\e[0m"
fi

# Check if we need to install xbox-smartglass-rest.
echo -e "\e[96mCheck current xbox-smartglass-rest ...\e[0m"
REST_INSTALL=false
if command_exists ~/.local/bin/xbox-rest-server; then
        echo -e "\e[0mxbox-smartglass-rest currently installed.";
else
        echo -e "\e[93mxbox-smartglass-rest is not installed.\e[0m";
        REST_INSTALL=true
fi

# Install xbox-smartglass-rest if necessary.
if $REST_INSTALL; then
        echo -e "\e[96mInstalling xbox-smartglass-rest ...\e[90m"
        pip3 install xbox-smartglass-rest || exit
        echo -e "\e[92mxbox-smartglass-rest installation Done!\e[0m"
fi

echo " "
echo -e "\e[92mMMM-Xbox and dependencies installation Done!\e[0m"
echo " "
