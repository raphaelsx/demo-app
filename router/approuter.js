const approuter = require('@sap/approuter');

var ar = approuter();

ar.beforeRequestHandler.use('/jwt', function (req, res, next) {
   res.end(`${req.session.user.token.accessToken}`);
});
ar.start();