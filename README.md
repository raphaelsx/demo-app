# demo-app
BTP Demo App

#GIT add all files
git add .
git commit -m "<commit name>"

#Build MTAR file
mbt build -t gen --mtar mta.tar
#Deploy MTAR file
cf deploy gen/mta.tar
