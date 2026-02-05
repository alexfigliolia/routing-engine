import type { IndexableRoute, IRoute } from "./types";

export class Route<
  T,
  P extends (() => any)[] = (() => any)[],
  A extends (() => Promise<boolean> | boolean)[] = (() =>
    | Promise<boolean>
    | boolean)[],
  C extends IndexableRoute[] = IndexableRoute[],
> {
  constructor(readonly config: IRoute<T, P, A, C>) {
    Object.freeze(this.config);
  }

  public async cacheRouteCode(maxDepth: number = 0) {
    const promises: (Promise<any> | undefined)[] = [];
    await this.asyncDFS(maxDepth, node => {
      promises.push(node.config.loader?.());
    });
    await Promise.all(promises);
  }

  public async cacheRouteLoaders(maxDepth = 0) {
    const promises: Promise<any>[] = [];
    await this.asyncDFS(maxDepth, node => {
      promises.push(...(node.config.parallelized ?? []).map(p => p()));
    });
    await Promise.all(promises);
  }

  public async loadChildren(): Promise<C> {
    if (typeof this.config.children === "function") {
      return this.config.children();
    }
    return this.config.children ?? ([] as unknown as C);
  }

  public toJSON() {
    return this.config;
  }

  private async asyncDFS<T>(maxDepth = 0, onNode: (route: Route<any>) => T) {
    const promises: (Promise<any> | undefined)[] = [];
    onNode(this);
    if (maxDepth > 0) {
      promises.push(
        new Promise<void>(resolve => {
          void this.loadChildren().then(children => {
            for (const child of children) {
              if (child instanceof Route) {
                promises.push(child.asyncDFS(maxDepth - 1, onNode));
              }
            }
            resolve();
          });
        }),
      );
    }
    await Promise.all(promises);
  }
}
