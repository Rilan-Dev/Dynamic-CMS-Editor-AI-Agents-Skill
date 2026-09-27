export interface ActivePopoverCoordinator {
  open(id: string, close: () => void): void;
  close(id: string): void;
  closeActive(): void;
  getActiveId(): string | null;
}

export function createActivePopoverCoordinator(): ActivePopoverCoordinator {
  let active: { id: string; close: () => void } | null = null;
  return {
    open(id, close) {
      if (active?.id !== id) active?.close();
      active = { id, close };
    },
    close(id) {
      if (active?.id === id) active = null;
    },
    closeActive() {
      const current = active;
      active = null;
      current?.close();
    },
    getActiveId: () => active?.id ?? null,
  };
}
