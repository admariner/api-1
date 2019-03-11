const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const logger = require('./lib/logger');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

if (config.api.cors) {
	logger.info('allowing CORS requests');
	router.use(
		cors({
			credentials: true,
			origin: config.api.cors
		})
	);
}

// v3 supports authentication via Bearer
router.use(require('./lib/auth/bearer'));

// v3 also supports cookie authentication
router.use(cookieParser());
router.use(require('./lib/auth/session'));

router.use('/account', require('./controllers/account'));
router.use('/charts', require('./controllers/charts'));
router.use('/users', require('./controllers/users'));
router.use('/jobs', require('./controllers/jobs'));
router.use('/stats', require('./controllers/stats'));

// plugin hooks
router.use('/plugins', require('./controllers/plugins'));

// TODO
// router.use('/folders', require('./controllers/folders'));
// router.use('/products', require('./controllers/products'));
// router.use('/teams', require('./controllers/teams'));
// router.use('/themes', require('./controllers/themes'));

module.exports = router;