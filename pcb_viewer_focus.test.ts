import { resolveViewerFocusConfig } from './pcb_viewer_focus_patch';

describe('PCB Viewer Focus Config', () => {
  it('should default focusOnHover to true', () => {
    expect(resolveViewerFocusConfig({})).toEqual({ focusOnHover: true });
  });

  it('should respect modern focusOnHover prop', () => {
    expect(resolveViewerFocusConfig({ focusOnHover: false })).toEqual({ focusOnHover: false });
  });

  it('should map legacy disableAutoFocus prop', () => {
    expect(resolveViewerFocusConfig({ disableAutoFocus: true })).toEqual({ focusOnHover: false });
  });
});
