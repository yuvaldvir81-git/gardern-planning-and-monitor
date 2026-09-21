"use client";

import { Component, type ReactNode } from "react";

export class MapErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center"
          style={{ height: "65vh" }}
        >
          <p className="font-medium text-destructive">Map failed to load</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
