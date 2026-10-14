import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AppErrorBoundary from '../src/os/windows/AppErrorBoundary.jsx';
import QuickNotesWidget from '../src/os/desktop/widgets/QuickNotesWidget.jsx';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
it('one failing app does not take down siblings or display exception plaintext', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Fail() {
    throw Error('SECRET_EXCEPTION_VALUE');
  }
  render(
    <>
      <AppErrorBoundary appTitle="Broken">
        <Fail />
      </AppErrorBoundary>
      <AppErrorBoundary appTitle="Healthy">
        <p>Other app is running</p>
      </AppErrorBoundary>
    </>,
  );
  expect(screen.getByText('Other app is running')).toBeTruthy();
  expect(screen.queryByText('SECRET_EXCEPTION_VALUE')).toBe(null);
  expect(screen.getByRole('button', { name: 'Reload Elyx' })).toBeTruthy();
});
it('scratchpad never hydrates or overwrites another account’s legacy plaintext draft', () => {
  localStorage.setItem('elyx_desktop_quick_note', 'LEGACY_PRIVATE_DRAFT');
  render(<QuickNotesWidget />);
  expect(screen.getByRole('textbox').value).toBe('');
  expect(localStorage.getItem('elyx_desktop_quick_note')).toBe(
    'LEGACY_PRIVATE_DRAFT',
  );
});
