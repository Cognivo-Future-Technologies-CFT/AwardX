import { Router } from 'express';
import authRouter from './auth.js';
import organizationsRouter from './organizations.js';
import overviewPageRouter from './overviewPage.js';
import programsRouter from './programs.js';
import scheduleRoundsRouter from './scheduleRounds.js';
import roundExecutionRouter from './roundExecution.js';
import judgeAssignmentRouter from './judgeAssignment.js';
import publicVotingRouter from './publicVoting.js';
import advancementRouter from './advancement.js';
import leaderboardRouter from './leaderboard.js';
import massEmailRouter from './massEmail.js';
import invitesRouter from './invites.js';
import integrationsRouter from './integrations.js';
import programFormsRouter from './programForms.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/organizations', organizationsRouter);
router.use('/overview', overviewPageRouter);
router.use('/programs', programsRouter);
router.use('/schedule-rounds', scheduleRoundsRouter);
router.use('/execution', roundExecutionRouter);
router.use('/judge-assignment', judgeAssignmentRouter);
router.use('/voting', publicVotingRouter);
router.use('/advancement', advancementRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/mass-email', massEmailRouter);
router.use('/invites', invitesRouter);
router.use('/integrations', integrationsRouter);
router.use('/program-forms', programFormsRouter);

export default router;
