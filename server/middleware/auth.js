const { readConfig } = require('../../core/config.jsc');

module.exports = function authMiddleware(req, res, next) {
  if (
    req.path.startsWith('/login') ||
    req.path.startsWith('/api/pin') ||
    req.path.startsWith('/assets')
  ) {
    return next();
  }

  const cfg = readConfig();
  // Jika user sudah login dengan PIN lokalnya -> izinkan masuk dashboard (Free maupun VIP)
  if (cfg.pinHash && req.session?.authenticated === true) {
    return next();
  }

  if (req.accepts('html')) return res.redirect('/login.html');
  return res.status(401).json({ error: 'Unauthorized' });
};
