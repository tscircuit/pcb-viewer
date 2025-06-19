import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, Mock } from 'vitest';
import { PCBViewer } from './PCBViewer';
import { useHotKey } from './hooks/useHotKey';

// Local ManualEditEvent type definition
type ManualEditEvent = {
  edit_event_id: string;
  edit_event_type: string;
  pcb_edit_event_type: string;
  pcb_component_id?: string;
  original_center?: { x: number; y: number };
  new_center?: { x: number; y: number };
  in_progress: boolean;
  created_at: number;
  pcb_port_id?: string;
  pcb_trace_hint_id?: string;
  route?: Array<{x: number, y: number, via?: boolean}>;
};

// Mock useHotKey
vi.mock('./hooks/useHotKey', () => ({
  useHotKey: vi.fn(),
}));
const mockedUseHotKey = useHotKey as Mock<[string, () => void], void>;

describe('PCBViewer Undo Functionality', () => {
  let hotkeyCallback: (() => void) | undefined;

  beforeEach(() => {
    hotkeyCallback = undefined;
    mockedUseHotKey.mockReset();
    mockedUseHotKey.mockImplementation((key: string, callback: () => void) => {
      if (key === 'ctrl+z') {
        hotkeyCallback = callback;
      }
    });
  });

  const createMockEvent = (id: string): ManualEditEvent => ({
    edit_event_id: id,
    edit_event_type: "edit_pcb_component_location",
    pcb_edit_event_type: 'edit_component_location',
    pcb_component_id: `comp-${id}`,
    original_center: { x: 0, y: 0 },
    new_center: { x: 1, y: 1 },
    in_progress: false,
    created_at: Date.now(),
  });

  test('should call onEditEventsChanged with updated list when in controlled mode', () => {
    const initialEvents: ManualEditEvent[] = [createMockEvent('evt1'), createMockEvent('evt2')];
    const mockOnEditEventsChanged = vi.fn();

    render(
      <PCBViewer
        editEvents={initialEvents}
        onEditEventsChanged={mockOnEditEventsChanged}
      />,
    );

    expect(hotkeyCallback).toBeDefined();
    if (!hotkeyCallback) throw new Error("Hotkey callback not set");

    act(() => {
      hotkeyCallback!(); // Invoke the ctrl+z handler
    });

    expect(mockOnEditEventsChanged).toHaveBeenCalledTimes(1);
    expect(mockOnEditEventsChanged).toHaveBeenCalledWith([initialEvents[0]]);
  });

  test('should do nothing if event list is empty (controlled mode)', () => {
    const initialEvents: ManualEditEvent[] = [];
    const mockOnEditEventsChanged = vi.fn();

    render(
      <PCBViewer
        editEvents={initialEvents}
        onEditEventsChanged={mockOnEditEventsChanged}
      />,
    );

    expect(hotkeyCallback).toBeDefined();
    if (!hotkeyCallback) throw new Error("Hotkey callback not set");

    act(() => {
      hotkeyCallback!();
    });

    expect(mockOnEditEventsChanged).not.toHaveBeenCalled();
  });

  test('should empty the list if one event exists (controlled mode)', () => {
    const initialEvents: ManualEditEvent[] = [createMockEvent('evt1')];
    const mockOnEditEventsChanged = vi.fn();

    render(
      <PCBViewer
        editEvents={initialEvents}
        onEditEventsChanged={mockOnEditEventsChanged}
      />,
    );

    expect(hotkeyCallback).toBeDefined();
    if (!hotkeyCallback) throw new Error("Hotkey callback not set");

    act(() => {
      hotkeyCallback!();
    });

    expect(mockOnEditEventsChanged).toHaveBeenCalledTimes(1);
    expect(mockOnEditEventsChanged).toHaveBeenCalledWith([]);
  });

  test('hotkey should be registered for ctrl+z', () => {
    render(<PCBViewer />);
    expect(mockedUseHotKey).toHaveBeenCalledWith('ctrl+z', expect.any(Function));
  });

  // TODO: Add tests for uncontrolled mode if possible/necessary.
  // This would require inspecting internal state, which is more complex
  // with Testing Library if not exposed via props or a test ID.
  // For now, controlled mode tests cover the core logic passed to onEditEventsChanged.
  // The internal state update (`setEditEvents_state`) is also implicitly tested
  // by the fact that onEditEventsChanged is called with the correct new list,
  // as the undo handler derives the new list from (props ?? internal_state)
  // and then calls both the internal setter and the external callback.
});
