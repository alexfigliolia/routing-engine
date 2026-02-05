import { LinkedList } from "@figliolia/data-structures";

import {
  Redirect,
  Route,
  RouteIntermediary,
  type IndexableRoute,
  type ExtendableRoute,
} from "../route";
import { AccessControlRedirect } from "../route";

import { Tree } from "./Tree";

export class Hierarchy {
  public static readonly paths = new Tree("ROOT");

  public static visualize() {
    return this.paths.children;
  }

  public static define<C extends IndexableRoute[]>(
    routes: C,
    currentNode = this.paths,
    currentPath: string[] = [],
  ) {
    for (const route of routes) {
      if (route instanceof Route) {
        const tokens = Hierarchy.pathTokens(route.config.path);
        const queue = new LinkedList(...tokens);
        let intermediaryNode = currentNode;
        while (queue.size) {
          const token = queue.shift()!;
          currentPath.push(token);
          intermediaryNode = intermediaryNode.indexRoute(
            this.toPath(currentPath),
            queue.size ? new RouteIntermediary({ path: token }) : route,
            token,
          );
        }
        if (Array.isArray(route.config.children)) {
          this.define(route.config.children, intermediaryNode, currentPath);
        }
        for (let i = 0; i < tokens.length; i++) {
          currentPath.pop();
        }
      } else if (route instanceof Redirect) {
        currentPath.push("*");
        currentNode.indexRedirect(this.toPath(currentPath), route);
        currentPath.pop();
      } else {
        throw new Error(
          `Invalid Route definition ${JSON.stringify(route, null, 2)}`,
        );
      }
    }
  }

  public static async matchPath(path: string | string[]): Promise<
    | {
        data: readonly any[];
        ui: any;
        route: ExtendableRoute;
      }[]
    | undefined
  > {
    return this.operateOnMatches(path, matches => {
      if (!matches.length) {
        return;
      }
      try {
        return Promise.all(matches.map(route => route.resolve()));
      } catch (error: unknown) {
        if (error instanceof AccessControlRedirect) {
          return this.matchPath(error.path);
        }
        throw error;
      }
    });
  }

  public static async preloadPath(path: string | string[], depth: number = 0) {
    return this.operateOnMatches(path, matches =>
      Promise.all(
        matches.map((route, i) =>
          route.cacheRouteCode(i === matches.length - 1 ? depth : 0),
        ),
      ),
    );
  }

  public static async prefetchData(path: string | string[], depth: number = 0) {
    return this.operateOnMatches(path, matches =>
      Promise.all(
        matches.map((route, i) =>
          route.cacheRouteLoaders(i === matches.length - 1 ? depth : 0),
        ),
      ),
    );
  }

  private static async operateOnMatches<T>(
    path: string | string[],
    operation: (routes: ExtendableRoute[]) => T,
  ) {
    const matches = await this.match(path);
    return operation(matches ?? []);
  }

  private static async match(
    path: string | string[],
  ): Promise<ExtendableRoute[] | undefined> {
    const redirects: Redirect[] = [];
    const matches: ExtendableRoute[] = [];
    const tokens = typeof path === "string" ? this.pathTokens(path) : path;
    const queue = new LinkedList<string>(...tokens);
    let current = this.paths;
    while (queue.size) {
      const token = queue.shift()!;
      if (current.hasRedirect) {
        redirects.push(current.get("*")!.value as Redirect);
      }
      const next = this.matchToken(token, current);
      if (!next) {
        if (await this.loadChildren(current)) {
          queue.unshift(token);
          continue;
        }
        if (redirects.length) {
          const redirect = redirects.pop()!;
          return this.match(this.parseRedirect(redirect, tokens));
        }
        return;
      }
      if (next.value instanceof Route) {
        matches.push(next.value);
      }
      current = next;
    }
    return matches;
  }

  private static toPath(path: string[]) {
    return path.join("/");
  }

  private static matchToken(token: string, node: Tree) {
    if (node.has(token)) {
      return node.get(token);
    }
    if (node.hasDynamicSegment) {
      for (const key in node.children) {
        if (key.startsWith(":")) {
          return node.children[key];
        }
      }
    }
    return;
  }

  private static parseRedirect(redirect: Redirect, tokens: string[]) {
    if (redirect.path.startsWith("..")) {
      const traversals = Array.from(redirect.path.matchAll(/\.\./g)).length;
      for (let i = 0; i < traversals; i++) {
        tokens.pop();
      }
      return tokens;
    }
    return this.pathTokens(redirect.path).map((token, i) =>
      token.startsWith(":") ? tokens[i]! : token,
    );
  }

  private static pathTokens(path: string) {
    return path.split("/").filter(Boolean);
  }

  private static async loadChildren(node: Tree) {
    if (
      !node.loaded &&
      node.value instanceof Route &&
      typeof node.value.config.children === "function"
    ) {
      const children = await node.value.loadChildren();
      this.define(children, node, this.pathTokens(node.fullPath));
      node.loaded = true;
      return true;
    }
    return false;
  }
}
