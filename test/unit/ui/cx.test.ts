import { cx } from '../../../src/shared/ui/cx';

describe('cx', () => {
  it('joins the class names that are present and skips the falsy ones', () => {
    expect(cx('btn', false, undefined, null, 'primary')).toBe('btn primary');
  });
});
