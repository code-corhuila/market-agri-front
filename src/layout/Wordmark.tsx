import styles from './Wordmark.module.css';

/**
 * Brand of the application: sprout + "Marketplace Agrícola Huila" (design-system.md, layout).
 * Visual only: whoever needs a link wraps it. The sprout is the favicon's drawing, so the brand
 * needs no icon library.
 */
export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <span className={styles.mark}>
        <svg viewBox="8 6 32 34" width="16" height="16" aria-hidden="true">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M24 37V21" />
            <path d="M24 25c0-6-4-10-11-11 0 7 4 11 11 11z" />
            <path d="M24 21c0-6 4-10 11-11 0 7-4 11-11 11z" />
          </g>
        </svg>
      </span>
      <span className={styles.text}>
        Marketplace <span className={styles.accent}>Agrícola Huila</span>
      </span>
    </span>
  );
}
