var JWTStrategy = require('@sap/xssec').JWTStrategy;
var xsenv = require('@sap/xsenv');
var express = require('express');
var passport = require('passport');
var request = require('request');
const SapCfAxios = require('sap-cf-axios').default;

var app = express();

//Step 1: Read Creadentials from Env Variables
const destService = xsenv.getServices({ dest: { tag: 'destination' } }).dest;
const xuaaService = xsenv.getServices({ uaa: { tag: 'xsuaa' } }).uaa;
const connService = xsenv.getServices({ conn: { tag: 'connectivity' } }).conn;

passport.use(new JWTStrategy(xsenv.getServices({xsuaa:{tag:'xsuaa'}}).xsuaa)); 
app.use(passport.initialize());
app.use(passport.authenticate('JWT', { session: false }));

app.get('/protected/authinfo', function (req, res) {
    res.status(200).json(req.authInfo);
});

app.get('/protected/test_destination', async function (req, res) {

    var return_message = {}

    try {

        if(req.query.destination && req.query.path) {

            const axios = SapCfAxios(req.query.destination);
            var authorization = req.headers.authorization;

            const response = await axios({
                method: 'GET',
                url: req.query.path,
                headers: {
                    authorization 
                }
            });

            return_message.process_destination = {}
            //Get Destination Service Token
            var destServiceToken = await _fetchOAuthToken(destService.url, destService.clientid, destService.clientsecret)
            return_message.process_destination.destination_token = {
                value: destServiceToken
            }

            //Get Destination
            var destination = await _fetchDestination(destServiceToken.access_token, req.query.destination)
            return_message.process_destination.destination = {
                value: destination
            }

            return_message.process_connectivity = {}
            //Get Connectivity Service Token
            var connServiceToken = await _fetchOAuthToken(connService.url, connService.clientid, connService.clientsecret)
            return_message.process_connectivity.connectivity_token = {
                value: connServiceToken
            }

            var callResult = await _callDestination(destination.destinationConfiguration, req.query.path, connServiceToken.access_token)

        } else {
            return_message.status = "ERROR";
            return_message.message = "Missing query paramter 'destination' and 'path'";
        }

    } catch (error) {
        return_message.status = "ERROR";
        return_message.message = error;
    }

    return_message.configuration = {
        destination: req.query.destination,
        path: req.query.path,
        dest_service: destService,
        xuaa_service: xuaaService,
        conn_service: connService
    }

    res.setHeader("content-type", "application/json");
    res.status(200).json(return_message);

});

const _callDestination = async function(destination, path, connServiceToken) {

    return new Promise ((resolve, reject) => {
        
        var targetURL = destination.URL + path;
        console.log('_callDestination: targetURL=' + targetURL);
        console.log('_callDestination: connServiceToken=' + connServiceToken);
        console.log('_callDestination: connService.onpremise_proxy_host=' + connService.onpremise_proxy_host);
        console.log('_callDestination: connService.onpremise_proxy_port=' + connService.onpremise_proxy_port);
        console.log('_callDestination: destination.CloudConnectorLocationId=' + destination.CloudConnectorLocationId);

        const config = {
            url: targetURL,
            method: 'GET',
            headers: {
                'Proxy-Authorization': 'Bearer ' + connServiceToken,
                'SAP-Connectivity-SCC-Location_ID': destination.CloudConnectorLocationId        
            },
            proxy: {
				host: connService.onpremise_proxy_host, 
				port: connService.onpremise_proxy_port 
            }              
        }
        try {
            request(config, (err, res, data) => {
                console.log('_callDestination: res.statusCode=' + res);
                console.log('_callDestination: data=' + data);
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data)
                }
            });
        } catch (error) {
            console.log('_callDestination: exception=' + error);
            reject(error)
        }
	})
}

const _fetchOAuthToken = async function(oAuthTokenURL, oAuthClient, oAuthSecret) {
    return new Promise ((resolve, reject) => {
        const config = {
            url: oAuthTokenURL + '/oauth/token?grant_type=client_credentials&response_type=token',
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(oAuthClient + ':' + oAuthSecret).toString('base64'),
            }
        }
        try {
            request(config, (err, res, data) => {
                resolve(JSON.parse(data));
            });
        } catch (error) {
            reject(error)
        }
	})
}

const _fetchDestination = async function(destServiceToken, destination) {
    return new Promise ((resolve, reject) => {
        var serviceURL = destService.uri + '/destination-configuration/v1/destinations/' + destination;
        const config = {
            url: serviceURL,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + destServiceToken,
            }
        }
        try {
            request(config, (err, res, data) => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    resolve(data)
                }
            });
        } catch (error) {
            reject(error)
        }
	})
}

app.get('/protected/destination_test', function (req, res) {

    console.log('Test started: ' + req.authInfo.userInfo.logonName);

    console.log('Step 1: Env Variables Loaded.');
    
    const oAuthPostRequest = {
        url: xuaaService.url + '/oauth/token',
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString('base64'),
            'Content-type': 'application/x-www-form-urlencoded'
        },
        form: {
            'client_id': destService.clientid,
            'grant_type': 'client_credentials'
        }
    }

    //Call XSUAA OAuth
    console.log('Step 2: Calling XSUAA OAuth Service');
    request(oAuthPostRequest, (err, res, data) => {
        
        console.log('Step 2: Result: ' + data);

        if (res.statusCode === 200) {
            
            const xsuaaToken = JSON.parse(data).access_token;
            
            const destinationRequest = {
                url: destService.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
                headers: {
                    'Authorization': 'Bearer ' + xsuaaToken,
                    'X-user-token': req.authInfo.token
                }
            }

            console.log('Step 3: Destination Service');
            request(destinationRequest, (err, res, data) => {
                console.log('Step 3: Result: ' + data);
                
                var oDestination = JSON.parse(data);
                var destinationToken = oDestination.authTokens[0];
                    
                const apiEndpointRequest = {
                    url: oDestination.destinationConfiguration.URL + sEndpoint,
                    headers: {
                        'Authorization': `${destinationToken.type} ${destinationToken.value}`
                    }
                }
                
                console.log('Step 4: Call SFSF API: ' + oDestination.destinationConfiguration.URL + sEndpoint);
                request(apiEndpointRequest, (err, res, data) => {
                    console.log('Step 4: Result: ' + data);
                });

                if(destinationToken.value == '') {
                    console.log('Step 3: Token empty');
                }
            });

        }
    });

    res.setHeader("content-type", "application/json");
    res.status(200).json(log);

});

// Start server
app.listen(process.env.PORT || 3000, ()=>{});