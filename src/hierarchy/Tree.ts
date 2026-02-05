import type { Redirect, RouteNode, TreeNode } from "../route";

export class Tree {
  public loaded = false;
  public hasRedirect = false;
  public hasDynamicSegment = false;
  static readonly cache: Record<string, Tree> = {};
  readonly children: Record<string, Tree> = {};
  constructor(
    readonly fullPath: string,
    readonly value?: TreeNode,
  ) {}

  public indexRoute(
    fullPath: string,
    route: RouteNode,
    pathFragment = route.config.path,
  ) {
    this.children[pathFragment] = Tree.create(fullPath, route);
    if (pathFragment.startsWith(":")) {
      this.hasDynamicSegment = true;
    }
    return this.children[pathFragment]!;
  }

  public indexRedirect(fullPath: string, route: Redirect) {
    this.children["*"] = Tree.create(fullPath, route);
    this.hasRedirect = true;
    return this.children[route.path]!;
  }

  public has(path: string) {
    return path in this.children;
  }

  public get(path: string) {
    return this.children[path];
  }

  public static create(fullPath: string, route: TreeNode) {
    if (!(fullPath in this.cache)) {
      this.cache[fullPath] = new Tree(fullPath, route);
    }
    return this.cache[fullPath]!;
  }
}
