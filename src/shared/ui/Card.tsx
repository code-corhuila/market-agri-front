import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

type CardElement = 'div' | 'li' | 'article' | 'section';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** The element it renders as, so a list of cards stays a list for assistive technology. */
  as?: CardElement;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md';
}

const PADDING_CLASS = { none: styles.padNone, sm: styles.padSm, md: styles.padMd } as const;

/** Base of every grid or list item. */
export function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx(
        styles.card,
        PADDING_CLASS[padding],
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
