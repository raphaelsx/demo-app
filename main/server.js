var express = require('express');
const SapCfAxios = require('sap-cf-axios').default;

var app = express();

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
        path: req.query.path
    }

    res.setHeader("content-type", "application/json");
    res.status(200).json(return_message);

});

// Start server
app.listen(process.env.PORT || 3000, ()=>{});