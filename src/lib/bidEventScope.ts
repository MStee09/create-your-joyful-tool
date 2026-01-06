// ============================================================================
// PHASE 2.1B: NEW FILE - src/lib/bidEventScope.ts
// ============================================================================
// This utility allows "scoping" a BidEvent to specific items from Buy Workflow.
// The scope is encoded in the event's notes field so we don't need a DB migration.
// ============================================================================

export type BidEventScope = {
  source: 'buy-workflow';
  includedRollupKeys: string[]; // rollupKey = commoditySpecId OR productId if no spec
};

const PREFIX = 'SCOPE_JSON:';

/**
 * Encode a scope into a string that can be stored in bid_events.notes
 */
export function encodeBidEventScope(scope: BidEventScope): string {
  return `${PREFIX}${JSON.stringify(scope)}`;
}

/**
 * Decode a scope from bid_events.notes, returns null if not present/valid
 */
export function decodeBidEventScope(notes?: string | null): BidEventScope | null {
  if (!notes) return null;
  const idx = notes.indexOf(PREFIX);
  if (idx === -1) return null;

  const json = notes.slice(idx + PREFIX.length).trim();
  try {
    const parsed = JSON.parse(json);
    if (parsed?.source === 'buy-workflow' && Array.isArray(parsed?.includedRollupKeys)) {
      return parsed as BidEventScope;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a bid event has a workflow scope
 */
export function hasWorkflowScope(notes?: string | null): boolean {
  return decodeBidEventScope(notes) !== null;
}

/**
 * Get a human-readable description of the scope
 */
export function describeBidEventScope(notes?: string | null): string | null {
  const scope = decodeBidEventScope(notes);
  if (!scope) return null;
  return `Scoped to ${scope.includedRollupKeys.length} item(s) from Buy Workflow`;
}
