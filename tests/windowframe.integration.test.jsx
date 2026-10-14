import React from 'react';
import {
  render,
  cleanup,
  fireEvent,
  act,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WindowFrame } from '../src/os/windows/WindowFrame.jsx';
vi.mock('../src/os/hooks/useOS.js', () => ({
  useOS: () => ({ settings: { windowSnapEnabled: true } }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('coalesces drag events to one bounds update per animation frame and cleans listeners', () => {
  let tick;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    tick = callback;
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const remove = vi.spyOn(window, 'removeEventListener'),
    update = vi.fn();
  const win = {
    id: 'notepad_1',
    title: 'Notes',
    appId: 'notepad',
    bounds: { x: 100, y: 100, width: 700, height: 600 },
    minSize: { width: 440, height: 380 },
    state: 'normal',
    snapPosition: 'none',
    isFocused: true,
    icon: { type: 'svg', viewBox: '0 0 24 24', path: '' },
  };
  const { unmount } = render(
    <WindowFrame
      win={win}
      onFocus={vi.fn()}
      onUpdateBounds={update}
      onSnap={vi.fn()}
    />,
  );
  fireEvent(
    screen.getByText('Notes'),
    new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 100,
    }),
  );
  for (let i = 0; i < 50; i++)
    fireEvent(
      window,
      new MouseEvent('pointermove', { clientX: 150 + i, clientY: 150 }),
    );
  expect(update).not.toHaveBeenCalled();
  act(() => tick());
  expect(update).toHaveBeenCalledTimes(1);
  unmount();
  expect(remove.mock.calls.some(([event]) => event === 'pointermove')).toBe(
    true,
  );
});
