import type { RouteIntermediary } from "./RouteIntermediary";
import type { Route } from "./Route";
import type { Redirect } from "./Redirect";

export interface IRoute<
  T,
  P extends readonly (() => any)[] = readonly (() => any)[],
  A extends readonly (() => Promise<true | string> | true | string)[] =
    readonly (() => Promise<true | string> | true | string)[],
  C extends IndexableRoute[] = IndexableRoute[],
> {
  readonly path: string;
  readonly component?: T;
  readonly loader?: () => Promise<T>;
  readonly parallelized?: P;
  readonly accessControls?: A;
  readonly children?: C | (() => Promise<C>);
}

export interface IRouteIntermediary {
  path: string;
}

export type ExtendableRoute = Route<any>;

export type IndexableRoute = ExtendableRoute | Redirect;

export type RouteNode = ExtendableRoute | RouteIntermediary;

export type TreeNode = IndexableRoute | RouteIntermediary;

export type ResolvedRouteData<T extends readonly (() => any)[]> = {
  [I in keyof T]: Awaited<ReturnType<T[I]>>;
};
