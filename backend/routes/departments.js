const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const departments = all('SELECT * FROM departments ORDER BY id');
  res.json({ code: 200, data: departments });
});

module.exports = router;
