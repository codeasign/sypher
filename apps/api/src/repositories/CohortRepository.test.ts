import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma';
import { CohortRepository } from './CohortRepository';

// listAllPage backs CohortController.listManage, which had NO cap at all
// before the pagination audit (2026-09) — this proves the new method
// actually bounds/slices/counts correctly against real rows, not just that
// the controller's arithmetic looks right on paper.
describe('CohortRepository.listAllPage', () => {
  const cohortRepository = new CohortRepository();
  const createdIds: string[] = [];
  const titlePrefix = `pagination-test-${randomUUID()}`;

  beforeAll(async () => {
    // Distinct updatedAt ordering matters for stable pagination — insert
    // sequentially so `orderBy: [{ updatedAt: desc }, { id: desc }]` has a
    // deterministic, known order to assert against.
    for (let i = 0; i < 5; i++) {
      const cohort = await cohortRepository.create({ title: `${titlePrefix}-${i}`, description: 'test' });
      createdIds.push(cohort.id);
    }
  });

  afterAll(async () => {
    await prisma.cohort.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('returns the full total even when the page is smaller', async () => {
    const { cohorts, total } = await cohortRepository.listAllPage(2, 0, titlePrefix);
    expect(cohorts).toHaveLength(2);
    expect(total).toBe(5);
  });

  it('slices a second page starting after the first', async () => {
    const first = await cohortRepository.listAllPage(2, 0, titlePrefix);
    const second = await cohortRepository.listAllPage(2, 2, titlePrefix);
    const firstIds = new Set(first.cohorts.map((c) => c.id));
    const secondIds = new Set(second.cohorts.map((c) => c.id));
    expect(second.cohorts).toHaveLength(2);
    // No overlap between consecutive pages.
    for (const id of secondIds) expect(firstIds.has(id)).toBe(false);
  });

  it('the last page returns the remainder, not a full page', async () => {
    const { cohorts, total } = await cohortRepository.listAllPage(2, 4, titlePrefix);
    expect(cohorts).toHaveLength(1);
    expect(total).toBe(5);
  });

  it('a limit at or above the real count returns everything, once', async () => {
    const { cohorts, total } = await cohortRepository.listAllPage(1000, 0, titlePrefix);
    expect(cohorts).toHaveLength(5);
    expect(total).toBe(5);
    expect(new Set(cohorts.map((c) => c.id)).size).toBe(5);
  });

  it('search scopes both the page and the total count', async () => {
    const { cohorts, total } = await cohortRepository.listAllPage(50, 0, 'no-such-cohort-title-exists');
    expect(cohorts).toHaveLength(0);
    expect(total).toBe(0);
  });
});
