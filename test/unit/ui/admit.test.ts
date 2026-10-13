import type { ToastKind } from '../../../src/shared/ui/toast';
import { admit } from '../../../src/shared/ui/toast/admit';

// Review of #13 (finding 1): the limit of three must not push an error out in favor of newer,
// less severe notices. The oldest notice that is not an error leaves first.
describe('admit', () => {
  type Notice = { id: number; kind: ToastKind };
  const error = (id: number): Notice => ({ id, kind: 'error' });
  const info = (id: number): Notice => ({ id, kind: 'info' });
  const ids = (list: Notice[]) => list.map((toast) => toast.id);

  it('adds the notice while the limit is not reached', () => {
    expect(ids(admit([info(1), info(2)], info(3), 3))).toEqual([1, 2, 3]);
  });

  it('removes the oldest notice when none is an error', () => {
    expect(ids(admit([info(1), info(2), info(3)], info(4), 3))).toEqual([2, 3, 4]);
  });

  it('keeps an error and removes the oldest notice that is not one', () => {
    expect(ids(admit([error(1), info(2), info(3)], info(4), 3))).toEqual([1, 3, 4]);
  });

  it('does not show a new notice that is not an error when every visible one is', () => {
    expect(ids(admit([error(1), error(2), error(3)], info(4), 3))).toEqual([1, 2, 3]);
  });

  it('removes the oldest error when all of them are errors', () => {
    expect(ids(admit([error(1), error(2), error(3)], error(4), 3))).toEqual([2, 3, 4]);
  });
});
