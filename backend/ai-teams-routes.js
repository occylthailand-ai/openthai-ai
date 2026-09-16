/**
 * AI Teams REST API Routes
 *
 * POST /api/ai-teams/dispatch     — ส่งงานโดยให้ระบบเลือกทีมเอง
 * POST /api/ai-teams/:teamId/run  — ส่งงานไปทีมที่ระบุโดยตรง
 * GET  /api/ai-teams              — รายการทีมทั้งหมด
 * GET  /api/ai-teams/:teamId      — ข้อมูลทีมเดียว
 * POST /api/ai-teams/overseer     — ส่งงานให้ Master Overseer
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from './middleware/error-handler.js'
import { validate } from './middleware/validate.js'
import { requireAuth } from './auth.js'
import { audit } from './audit.js'
import { log } from './logger.js'
import {
  dispatch,
  runTeamTask,
  TEAM_LIST,
  TEAM_REGISTRY,
  MASTER_OVERSEER,
  resolveTeam,
  TEAM_COUNT,
} from './ai-teams.js'

const router = Router()

const teamRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI team requests. Retry in 1 minute.' } },
})

// GET /api/ai-teams — รายการทีมทั้งหมด (public)
router.get('/', asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    count: TEAM_COUNT,
    teams: TEAM_LIST,
    overseer: {
      id: MASTER_OVERSEER.id,
      name: MASTER_OVERSEER.name,
      description: MASTER_OVERSEER.description,
    },
  })
}))

// GET /api/ai-teams/:teamId — ข้อมูลทีมเดียว (public)
router.get('/:teamId', asyncHandler(async (req, res) => {
  const { teamId } = req.params
  if (teamId === 'master-overseer') {
    return res.json({ success: true, team: { id: MASTER_OVERSEER.id, name: MASTER_OVERSEER.name, description: MASTER_OVERSEER.description } })
  }
  const team = TEAM_REGISTRY[teamId]
  if (!team) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Team '${teamId}' not found` } })
  res.json({ success: true, team: { id: teamId, name: team.name, description: team.description, tools: team.tools } })
}))

// POST /api/ai-teams/dispatch — auto-route by intent
router.post('/dispatch', requireAuth, teamRateLimit, asyncHandler(async (req, res) => {
  validate(req.body, { task: 'required|minlen:3' })
  const { task, intent, sessionId } = req.body
  const userId = req.user?.id

  const resolvedTeamId = resolveTeam(intent || task)
  log.info('ai_team_dispatch', { resolvedTeamId, userId, task: task.slice(0, 80) })

  const result = await dispatch({ intent: intent || task, task, sessionId, userId })

  audit.log(req, 'ai_team_dispatched', { teamId: result.teamId, task: task.slice(0, 80) })
  res.json({ success: true, resolvedTeam: resolvedTeamId, ...result })
}))

// POST /api/ai-teams/overseer — Master Overseer
router.post('/overseer', requireAuth, teamRateLimit, asyncHandler(async (req, res) => {
  validate(req.body, { task: 'required|minlen:3' })
  const { task, sessionId } = req.body
  const userId = req.user?.id

  log.info('master_overseer_request', { userId, task: task.slice(0, 80) })

  const result = await runTeamTask({ teamId: 'master-overseer', task, sessionId, userId })

  audit.log(req, 'master_overseer_called', { task: task.slice(0, 80) })
  res.json({ success: true, ...result })
}))

// POST /api/ai-teams/:teamId/run — direct to specific team
router.post('/:teamId/run', requireAuth, teamRateLimit, asyncHandler(async (req, res) => {
  const { teamId } = req.params
  validate(req.body, { task: 'required|minlen:3' })
  const { task, sessionId, context } = req.body
  const userId = req.user?.id

  if (teamId !== 'master-overseer' && !TEAM_REGISTRY[teamId]) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Team '${teamId}' not found. GET /api/ai-teams for the list.` } })
  }

  log.info('ai_team_run', { teamId, userId, task: task.slice(0, 80) })

  const result = await runTeamTask({ teamId, task, sessionId, userId, context })

  audit.log(req, 'ai_team_task_completed', { teamId, task: task.slice(0, 80) })
  res.json({ success: true, ...result })
}))

export default router
