# demo-app
BTP Demo App

#GIT commands
git remote set-url origin https://github.com/raphaelsx/demo-app.git
git pull
git push -u origin main
git add .
git commit -m "<commit name>"

#Build MTAR file
mbt build -t gen --mtar mta.tar
#Deploy MTAR file
cf deploy gen/mta.tar
