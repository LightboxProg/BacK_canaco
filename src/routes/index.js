const express = require('express');
const authRoutes = require('./auth.routes');
const contactRoutes = require('./contact.routes');
const messageRoutes = require('./message.routes');
const groupRoutes = require('./group.routes');
const internalRoutes = require('./internal.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/groups', groupRoutes);
router.use('/messages', messageRoutes);
router.use('/internal', internalRoutes); // n8n webhook routes

module.exports = router;
