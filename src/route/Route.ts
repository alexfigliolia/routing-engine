import type { IndexableRoute, IRoute, ResolvedRouteData } from "./types";
import { AccessControlRedirect } from "./AccessControlRedirect";

export class Route<
  T,
  P extends readonly (() => any)[] = readonly (() => any)[],
  A extends readonly (() => Promise<true | string> | true | string)[] =
    readonly (() => Promise<true | string> | true | string)[],
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

  public async resolve() {
    await this.runAccessControls();
    const [data, ui] = await Promise.all([
      this.runResolvers(),
      (this.config.component ?? this.config.loader?.())!,
    ]);
    return { data, ui, route: this };
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

  private async runAccessControls() {
    if (this.config.accessControls) {
      const accessors = this.config.accessControls.map(fn => fn());
      const resolutions = await Promise.all(accessors);
      for (const resolution of resolutions) {
        if (typeof resolution === "string") {
          throw new AccessControlRedirect(resolution);
        }
      }
    }
  }

  private async runResolvers() {
    if (this.config.parallelized) {
      return Promise.all(
        this.config.parallelized.map?.(loader => loader()),
      ) as Promise<ResolvedRouteData<P>>;
    }
    return [] as ResolvedRouteData<P>;
  }
}

// const myRoute = new Route({
//   path: "my-path",
//   loader: async () => "<div />",
//   parallelized: [
//     async () => ({ data: true }),
//     async () => ({ moreData: 3 }),
//   ] as const,
// });

// const { data, ui } = await myRoute.resolve();
