#!/bin/bash

echo -e "\e[96mCleaning MMM-Xbox & dependencies ...\e[90m"
cd ~/.local/bin
rm -rf xbox*
cd ~/.local/lib/python3.7/site-packages
rm -rf xbox*
cd ~/MagicMirror/modules/MMM-Xbox
rm -rf package-lock.json node_modules

echo " "
echo -e "\e[92mMMM-Xbox and dependencies Cleaned!\e[0m"
echo " "
