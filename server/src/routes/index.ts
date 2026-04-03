import { Router } from 'express';
import authRouter from './auth.js';
import organizationsRouter from './organizations.js';
import programsRouter from './programs.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/organizations', organizationsRouter);
router.use('/programs', programsRouter);

export default router;
