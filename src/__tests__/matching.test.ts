import { beforeAll, describe, expect, test } from "vitest";

import { Redirect, Route } from "../route";
import { Hierarchy } from "../hierarchy";

describe("Route Matching", () => {
  beforeAll(() => {
    Hierarchy.define([
      new Route({ path: "home" }),
      new Route({
        path: "about",
        children: [new Route({ path: "info" }), new Redirect("../")],
      }),
      new Route({
        path: "app",
        children: async () => [
          new Route({
            path: ":id",
            children: [
              new Route({ path: "app-child-1" }),
              new Redirect("app/:id"),
            ],
          }),
          new Route({
            path: "app-child-2",
            children: [
              new Route({
                path: "nested/path",
                children: async () => [
                  new Route({ path: "nested-promise" }),
                  new Redirect("app/app-child-2/nested/path"),
                ],
              }),
              new Redirect("app/app-child-2"),
            ],
          }),
        ],
      }),
      new Redirect("home"),
    ]);
  });

  test("It can match routes", async () => {
    expect(await Hierarchy.match("home")).toHaveLength(1);
    expect(await Hierarchy.match("about")).toHaveLength(1);
    expect(await Hierarchy.match("app")).toHaveLength(1);
  });

  test("It can match child routes", async () => {
    const matches = await Hierarchy.match("about/info");
    expect(matches?.length).toEqual(2);
  });

  test("It can match child routes with dynamic segments", async () => {
    const matches = await Hierarchy.match("app/4");
    expect(matches?.length).toEqual(2);
  });

  test("It can match asynchronously loaded child routes", async () => {
    const matches1 = await Hierarchy.match("app/4/app-child-1");
    expect(matches1?.length).toEqual(3);
    const matches2 = await Hierarchy.match(
      "app/app-child-2/nested/path/nested-promise",
    );
    expect(matches2?.length).toEqual(4);
    expect(matches2?.at(-1)?.config.path).toEqual("nested-promise");
  });

  test("It can redirect", async () => {
    const matches = await Hierarchy.match("nowhere");
    expect(matches?.at(-1)?.config?.path).toEqual("home");
  });

  test("It can redirect to the deepest matched redirect", async () => {
    const matches1 = await Hierarchy.match("app/4/app-child-2");
    expect(matches1?.at(-1)?.config?.path).toEqual(":id");
    const matches2 = await Hierarchy.match("app/app-child-2/nested/path/whiff");
    expect(matches2?.at(-1)?.config?.path).toEqual("nested/path");
  });

  test("It can support relative redirects", async () => {
    const matches1 = await Hierarchy.match("about/info/blah");
    expect(matches1?.at(-1)?.config.path).toEqual("info");
    const matches2 = await Hierarchy.match("about/blah");
    expect(matches2?.at(-1)?.config.path).toEqual("about");
  });
});
