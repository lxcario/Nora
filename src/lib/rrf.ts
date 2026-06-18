/**
 * Reciprocal Rank Fusion (RRF) — pure module.
 *
 * Mirrors the fusion math implemented in
 * `supabase/migrations/012_hybrid_search.sql#match_paper_chunks_hybrid`,
 * so the same ordering can be produced in application code (e.g. as a
 * fallback when the hybrid RPC isn't deployed yet) and unit-tested without a
 * live database. (spec Req 6.1, 6.5)
 *
 * RRF score for an item = Σ_legs 1 / (k + rank_in_leg), where `rank` is the
 * 1-based position of the item within a ranked leg. Items absent from a leg
 * contribute 0 for that leg. Higher fused score = more relevant.
 *
 * Reference: Cormack, Clarke & Buettcher (2009), "Reciprocal Rank Fusion
 * outperforms Condorcet and individual rank learning methods."
 */

/** Standard RRF damping constant (matches the SQL default). */
export const DEFAULT_RRF_K = 60;

/** A single ranked leg: item ids in best-first order. */
export type RankedLeg = readonly string[];

export interface FusedItem {
  id: string;
  /** 1-based rank in the lexical leg, or null if absent. */
  lexicalRank: number | null;
  /** 1-based rank in the vector leg, or null if absent. */
  vectorRank: number | null;
  /** Combined RRF score (higher = better). */
  score: number;
}

/**
 * Fuse two ranked legs (lexical + vector) with Reciprocal Rank Fusion.
 *
 * Ordering matches the SQL function: by `score` descending. Ties are broken
 * deterministically by ascending `tieBreak` value when supplied (the SQL uses
 * `chunk_index ASC`), otherwise by ascending id for stability.
 *
 * @param lexicalLeg Item ids ranked best-first by lexical relevance.
 * @param vectorLeg  Item ids ranked best-first by vector similarity.
 * @param options    `k` damping constant; `tieBreak` id→number for tie order.
 */
export function fuseRRF(
  lexicalLeg: RankedLeg,
  vectorLeg: RankedLeg,
  options: { k?: number; tieBreak?: (id: string) => number } = {}
): FusedItem[] {
  const k = options.k ?? DEFAULT_RRF_K;

  const lexicalRankOf = buildRankMap(lexicalLeg);
  const vectorRankOf = buildRankMap(vectorLeg);

  // Union of ids appearing in either leg.
  const ids = new Set<string>([...lexicalLeg, ...vectorLeg]);

  const fused: FusedItem[] = [];
  for (const id of ids) {
    const lexicalRank = lexicalRankOf.get(id) ?? null;
    const vectorRank = vectorRankOf.get(id) ?? null;
    const score =
      (lexicalRank !== null ? 1 / (k + lexicalRank) : 0) +
      (vectorRank !== null ? 1 / (k + vectorRank) : 0);
    fused.push({ id, lexicalRank, vectorRank, score });
  }

  const tieBreak = options.tieBreak;
  fused.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (tieBreak) return tieBreak(a.id) - tieBreak(b.id);
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return fused;
}

/** Build a 1-based rank lookup from a best-first id list (first occurrence wins). */
function buildRankMap(leg: RankedLeg): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < leg.length; i++) {
    const id = leg[i];
    if (!map.has(id)) map.set(id, i + 1); // 1-based rank
  }
  return map;
}
