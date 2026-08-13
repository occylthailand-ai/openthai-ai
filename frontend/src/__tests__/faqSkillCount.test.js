import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FAQ_ITEMS } from '../data/faqContent';

// The FAQ "what AI tools are there?" answer states a skill count, and FAQ_ITEMS feeds BOTH the visible
// /faq page AND the FAQPage JSON-LD (Google rich result). It used to overstate — th "มากกว่า 35",
// en "Over 35", zh "超过 35" — while the backend SKILLS_REGISTRY holds exactly 35, so the claim shown
// to buyers and to Google was literally false (35 is not "more than 35"), against this repo's
// honesty rule. This pins the FAQ's number to the real registry count and forbids the overstatement
// wording, in every language, so the claim can't silently drift or re-inflate. Reads backend/server.js
// directly (same cross-file approach as the SEO-invariant tests) — no import of the server.
const here = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(join(here, '..', '..', '..', 'backend', 'server.js'), 'utf8');

// Count the entries in `const SKILLS_REGISTRY = [ ... ];` by their `id:` fields (same as
// scripts/generate-project-status.mjs treats as the canonical skill total).
function realSkillCount() {
  const m = serverSrc.match(/SKILLS_REGISTRY\s*=\s*\[([\s\S]*?)\n\];/);
  expect(m, 'SKILLS_REGISTRY array found in backend/server.js').toBeTruthy();
  const ids = m[1].match(/\bid:\s*['"][^'"]+['"]/g) || [];
  return ids.length;
}

// The skills Q&A is the FAQ answer that links to the AI-tools page.
const skillsAnswer = (lang) => {
  const pair = FAQ_ITEMS[lang].find(([, a]) => /\/ai-skills/.test(a));
  expect(pair, `a /ai-skills FAQ answer exists for "${lang}"`).toBeTruthy();
  return pair[1];
};

describe('FAQ AI-skill count stays accurate to the real SKILLS_REGISTRY', () => {
  const count = realSkillCount();

  it('backend exposes a positive skill count', () => {
    expect(count).toBeGreaterThan(0);
  });

  for (const lang of ['th', 'en', 'zh']) {
    it(`"${lang}" FAQ states exactly ${count} and never overstates it`, () => {
      const answer = skillsAnswer(lang);
      // states the real number
      expect(answer, `${lang} FAQ should mention the real count ${count}`).toContain(String(count));
      // never the "more than / over" overstatement that made it false at exactly 35
      expect(answer, `${lang} FAQ must not overstate the skill count`).not.toMatch(/มากกว่า|กว่า\s*\d|\bover\b|more than|超过|超過/i);
    });
  }
});
