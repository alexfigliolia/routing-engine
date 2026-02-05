import type { RouteIntermediary } from "./RouteIntermediary";
import type { Route } from "./Route";
import type { Redirect } from "./Redirect";

export interface IRoute<
  T,
  P extends (() => any)[] = (() => any)[],
  A extends (() => Promise<boolean> | boolean)[] = (() =>
    | Promise<boolean>
    | boolean)[],
  C extends IndexableRoute[] = IndexableRoute[],
> {
  path: string;
  component?: T;
  loader?: () => Promise<T>;
  parallelized?: P;
  accessControls?: A;
  children?: C | (() => Promise<C>);
}

export interface IRouteIntermediary {
  path: string;
}

export type ExtendableRoute = Route<any>;

export type IndexableRoute = ExtendableRoute | Redirect;

export type RouteNode = ExtendableRoute | RouteIntermediary;

export type TreeNode = IndexableRoute | RouteIntermediary;
