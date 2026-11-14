const express = require('express');
const fs = require('fs'), path = require('path');
const router = express.Router();
const DIR = path.join(__dirname, '../../plugins');

router.get('/api/plugins', (req, res) => {
  if (!fs.existsSync(DIR)) return res.json({ plugins: [] });
  res.json({ plugins: fs.readdirSync(DIR).filter(f => f.endsWith('.js')) });
});
module.exports = router;
