import { lazy, Suspense, useMemo, useState } from 'react';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import { LoadingBlock } from '../shared/ui/LoadingBlock';
import type { Portal } from './registry';

/** Mounts one portal: downloaded on first use, contained by its own RemoteBoundary. */
export function RemotePage({ portal }: { portal: Portal }) {
  const [attempt, setAttempt] = useState(0);
  // A new lazy component per attempt: React.lazy remembers a failed download forever.
  const Remote = useMemo(() => lazy(portal.load), [portal, attempt]);

  return (
    // Keyed by portal: every route renders the boundary in the same place, so without the key a
    // failed portal would leave the next one, opened from the header, marked as failed too.
    <RemoteBoundary key={portal.name} title={portal.title} onRetry={() => setAttempt((n) => n + 1)}>
      <Suspense fallback={<LoadingBlock label={`Cargando ${portal.title}…`} />}>
        <Remote />
      </Suspense>
    </RemoteBoundary>
  );
}
