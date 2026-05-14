/**
 * Board API — Central Command Board for Mythos Team
 * GET  /api/board          — อ่าน board ทั้งหมด (admin)
 * POST /api/board/obstacle — รายงานอุปสรรคใหม่ (agents)
 * PUT  /api/board/resolve  — mark obstacle resolved (agents)
 * GET  /api/board/status   — team status snapshot (public)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const BOARD_FILE = path.join(__dirname, '../data/board/command-board.json');

function readBoard() {
  try {
    return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeBoard(data) {
  fs.writeFileSync(BOARD_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/board — full board (admin only)
router.get('/', (req, res) => {
  const board = readBoard();
  if (!board) return res.status(500).json({ error: 'Board unavailable' });
  res.json({ ok: true, board });
});

// GET /api/board/status — team status + active obstacles (public summary)
router.get('/status', (req, res) => {
  const board = readBoard();
  if (!board) return res.status(500).json({ error: 'Board unavailable' });

  const activeCount = board.active_obstacles?.length || 0;
  const resolvedCount = board.resolved?.length || 0;
  const criticalCount = (board.active_obstacles || []).filter(o => o.severity === 'CRITICAL').length;
  const initialObs = board.initial_obstacle_report?.items || [];
  const allActive = [...(board.active_obstacles || []), ...initialObs.filter(i => i.status === 'PENDING' || i.status === 'IN_PROGRESS')];

  res.json({
    ok: true,
    summary: {
      board_status: board.status,
      total_agents: Object.keys(board.team_status).length,
      agents_online: Object.values(board.team_status).filter(a => a.status === 'ONLINE').length,
      active_obstacles: allActive.length,
      critical_obstacles: criticalCount + allActive.filter(o => o.severity === 'CRITICAL').length,
      resolved: resolvedCount,
    },
    team_status: board.team_status,
    active_obstacles: allActive,
    notification_hours: board.notification_hours,
    last_updated: new Date().toISOString(),
  });
});

// POST /api/board/obstacle — agent รายงานอุปสรรคใหม่
router.post('/obstacle', (req, res) => {
  const { agent, title, detail, severity = 'IMPORTANT', assigned_to, action_url } = req.body;
  if (!agent || !title) return res.status(400).json({ error: 'agent and title required' });

  const board = readBoard();
  if (!board) return res.status(500).json({ error: 'Board unavailable' });

  const id = `OBS-${String(Date.now()).slice(-6)}`;
  const obstacle = {
    id,
    severity,
    agent,
    title,
    detail: detail || '',
    action_url: action_url || null,
    assigned_to: assigned_to || 'mythos',
    status: 'PENDING',
    reported_at: new Date().toISOString(),
    eta: null,
  };

  board.active_obstacles.push(obstacle);
  board.board_log.push({
    ts: new Date().toISOString(),
    event: 'OBSTACLE_REPORTED',
    id,
    by: agent,
    title,
  });

  writeBoard(board);

  // TODO: ส่ง LINE notification ผ่าน Hermes ถ้าอยู่ในเวลา 08:00-18:00
  console.log(`[BOARD] 🚨 New obstacle ${id} from ${agent}: ${title}`);

  res.json({ ok: true, id, message: `Obstacle ${id} reported to board` });
});

// PUT /api/board/resolve — mark obstacle as resolved
router.put('/resolve', (req, res) => {
  const { id, resolved_by, resolution } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const board = readBoard();
  if (!board) return res.status(500).json({ error: 'Board unavailable' });

  const idx = board.active_obstacles.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: `Obstacle ${id} not found in active` });

  const obstacle = board.active_obstacles.splice(idx, 1)[0];
  obstacle.status = 'RESOLVED';
  obstacle.resolved_by = resolved_by || 'unknown';
  obstacle.resolution = resolution || 'ไม่ระบุวิธีแก้ไข';
  obstacle.resolved_at = new Date().toISOString();

  board.resolved.push(obstacle);
  board.board_log.push({
    ts: new Date().toISOString(),
    event: 'OBSTACLE_RESOLVED',
    id,
    by: resolved_by,
    resolution,
  });

  writeBoard(board);
  console.log(`[BOARD] ✅ Obstacle ${id} resolved by ${resolved_by}`);

  res.json({ ok: true, id, message: `Obstacle ${id} marked as resolved` });
});

// PUT /api/board/agent-status — อัปเดตสถานะ agent
router.put('/agent-status', (req, res) => {
  const { agent_id, status, current_task } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

  const board = readBoard();
  if (!board) return res.status(500).json({ error: 'Board unavailable' });

  if (!board.team_status[agent_id]) {
    return res.status(404).json({ error: `Agent ${agent_id} not found` });
  }

  board.team_status[agent_id].status = status || board.team_status[agent_id].status;
  board.team_status[agent_id].last_seen = new Date().toISOString();
  if (current_task) board.team_status[agent_id].current_task = current_task;

  writeBoard(board);
  res.json({ ok: true, agent_id, status: board.team_status[agent_id] });
});

module.exports = router;
