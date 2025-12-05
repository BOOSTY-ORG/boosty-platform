import express from 'express';
import * as authCtrl from '../controllers/auth.controller.js';

const router = express.Router();

router.route('/auth/login').post(authCtrl.login);
router.route('/auth/logout').get(authCtrl.logout);

export default router;
