import { beforeAll, describe, expect, test } from "vitest";

import { Route } from "../route";
import { Hierarchy } from "../hierarchy";

class LoaderTracker {
  static preloadedRoutes = 0;

  static load = async () => {
    this.preloadedRoutes++;
  };

  static async assert(operation: Promise<any>, preloadedRoutes: number) {
    await operation;
    expect(this.preloadedRoutes).toEqual(preloadedRoutes);
    this.reset();
  }

  private static reset() {
    this.preloadedRoutes = 0;
  }
}

describe("Route Component Preloading", () => {
  beforeAll(() => {
    Hierarchy.define([
      new Route({ path: "preload-1", loader: LoaderTracker.load }),
      new Route({
        path: "preload-2",
        loader: LoaderTracker.load,
        children: async () => [
          new Route({ path: "preload-3", loader: LoaderTracker.load }),
          new Route({ path: "preload-4", loader: LoaderTracker.load }),
        ],
      }),
    ]);
  });

  test("It can preload paths with configurable depths", async () => {
    await LoaderTracker.assert(Hierarchy.preloadPath("preload-1"), 1);
    await LoaderTracker.assert(Hierarchy.preloadPath("preload-2"), 1);
    await LoaderTracker.assert(Hierarchy.preloadPath("preload-2", 1), 3);
    await LoaderTracker.assert(Hierarchy.preloadPath("preload-2", 100), 3);
  });
});
