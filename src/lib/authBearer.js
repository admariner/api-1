const {AuthToken} = require('datawrapper-orm/models');

module.exports = async (req, res, next) => {
    const auth = req.get('Authentication');
    if (auth) {
        const [type, token] = auth.split(' ');
        if (type.toLowerCase() == 'bearer') {
            if (token) {
                try {
                    const at = await AuthToken.findOne({where: {token:token.trim()}});
                    if (!at) return next('Authentication failed. Unknown Bearer token!');

                    res.user = await at.getUser();
                    next();
                } catch(e) {
                    next(e);
                }
            } else {
                next(`Authentication failed. Bearer token must not be empty!`);
            }
        } else {
            next(`Authentication failed. Unsupported authentication type '${type}'!`);
        }
    }
    next();
}
