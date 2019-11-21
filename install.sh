echo "Installing python 3 pip"
sudo apt-get install python3-pip
echo " "
echo "Installing xbox-smartglass-rest Server"
pip3 install xbox-smartglass-rest
echo " "
echo "Installing MMM-Xbox"
git pull
npm install
