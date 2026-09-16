/**
 * AI Teams REST API Routes — Phase A MVP
 *
 * Active (Phase A):  marketing-team, sales-team, finance-team, supply-chain-team, master-overseer
 * Planned (Phase B/C): all other 23 teams — registered but cannot be called until activated
 *
 * GET  /api/ai-teams                     — all teams with status (public)
 * GET  /api/ai-teams?status=active       — filter active only
 * GET  /api/ai-teams?status=planned      — filter planned only
 * GET  /api/ai-teams/:teamId             — single team info
 * POST /api/ai-teams/dispatch            — auto-route to active team by intent
 * POST /api/ai-teams/overseer            — Control Tower (Phase A)
 * POST /api/ai-teams/:teamId/run         — run specific active team
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler, ApiError } from './middleware/error-handler.js'
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
  ACTIVE_TEAM_COUNT,
  ACTIVE_TEAM_IDS,
} from './ai-teams.js'

const router = Router()

const teamRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI team requests. Retry in 1 minute.' } },
})

// GET /api/ai-teams — all teams with optional ?status= filter
router.get('/', asyncHandler(async (req, res) => {
  const statusFilter = req.query.status // 'active' | 'planned' | undefined

  let teams = TEAM_LIST
  if (statusFilter === 'active') teams = TEAM_LIST.filter(t => t.status === 'active')
  else if (statusFilter === 'planned') teams = TEAM_LIST.filter(t => t.status === 'planned')

  res.json({
    success: true,
    phase: 'A',
    totalTeams: TEAM_COUNT,
    activeTeams: ACTIVE_TEAM_COUNT,
    plannedTeams: TEAM_COUNT - ACTIVE_TEAM_IDS.size,
    filter: statusFilter || 'all',
    teams,
    overseer: {
      id: MASTER_OVERSEER.id,
      name: MASTER_OVERSEER.name,
      description: MASTER_OVERSEER.description,
      phase: MASTER_OVERSEER.phase,
      status: MASTER_OVERSEER.status,
    },
  })
}))

// GET /api/ai-teams/:teamId — single team info
router.get('/:teamId', asyncHandler(async (req, res) => {
  const { teamId } = req.params
  if (teamId === 'master-overseer') {
    return res.json({
      success: true,
      team: {
        id: MASTER_OVERSEER.id,
        name: MASTER_OVERSEER.name,
        description: MASTER_OVERSEER.description,
        phase: MASTER_OVERSEER.phase,
        status: MASTER_OVERSEER.status,
      },
    })
  }
  const team = TEAM_REGISTRY[teamId]
  if (!team) throw ApiError.notFound(`Team '${teamId}' not found. GET /api/ai-teams for the list.`)

  res.json({
    success: true,
    team: {
      id: teamId,
      name: team.name,
      description: team.description,
      phase: team.phase,
      status: team.status,
      tools: team.tools,
    },
  })
}))

// POST /api/ai-teams/dispatch — auto-route to active team
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

// POST /api/ai-teams/overseer — Control Tower
router.post('/overseer', requireAuth, teamRateLimit, asyncHandler(async (req, res) => {
  validate(req.body, { task: 'required|minlen:3' })
  const { task, sessionId } = req.body
  const userId = req.user?.id

  log.info('control_tower_request', { userId, task: task.slice(0, 80) })

  const result = await runTeamTask({ teamId: 'master-overseer', task, sessionId, userId })

  audit.log(req, 'control_tower_called', { task: task.slice(0, 80) })
  res.json({ success: true, ...result })
}))

// POST /api/ai-teams/:teamId/run — run specific team (active only)
router.post('/:teamId/run', requireAuth, teamRateLimit, asyncHandler(async (req, res) => {
  const { teamId } = req.params
  validate(req.body, { task: 'required|minlen:3' })
  const { task, sessionId, context } = req.body
  const userId = req.user?.id

  if (teamId !== 'master-overseer' && !TEAM_REGISTRY[teamId]) {
    throw ApiError.notFound(`Team '${teamId}' not found. GET /api/ai-teams for the list.`)
  }

  // Block planned teams — return 422 with helpful context
  if (teamId !== 'master-overseer') {
    const team = TEAM_REGISTRY[teamId]
    if (team.status === 'planned') {
      return res.status(422).json({
        success: false,
        error: {
          code: 'TEAM_NOT_ACTIVE',
          message: `Team '${teamId}' (${team.name}) is planned for Phase ${team.phase} and not yet active.`,
          activeTeams: [...ACTIVE_TEAM_IDS],
          hint: 'Use GET /api/ai-teams?status=active to see available teams.',
        },
      })
    }
  }

  log.info('ai_team_run', { teamId, userId, task: task.slice(0, 80) })

  const result = await runTeamTask({ teamId, task, sessionId, userId, context })

  audit.log(req, 'ai_team_task_completed', { teamId, phase: result.phase, task: task.slice(0, 80) })
  res.json({ success: true, ...result })
}))

export default router
