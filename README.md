# Routing Engine

A routing engine for UI projects built with JavaScript. This is a little bit of a work in progress, but ideally it becomes the internals for a web framework's router.

It's loosely based on Angular/React Router's route-definition spec with support for

1. Type-safe declarations of loaded data and components
2. Preloadable route artifacts like JavaScript, CSS, HTML, and data
3. Lazilly resolved child routes

## API

At its core this package provides a mechanism for declaring and matching routes - mimical of how the browser matches URL's. This package allows you to bring your own URL-based routing implementation (such as the history api in the browser) and it'll provide:

1. Support for matching URL paths against the routes you declare
2. Asynchronously loading your code and data along side matched routes
3. Lazily resolving child routes based on match necessity

### Declaring Routes

To declare `Routes` and/or `Redirects` you can do so anywhere in your code like so:

```typescript
import { Route, Redirect, Hierarchy } from "routing-engine";

const myPageRoutes = new Route({
  path: "my-path",
  loader: () => import("./my/ui").then(v => v.MyUI),
  children: [
    new Route({
      route: "nested-path",
      loader: () => import("./my/nested/ui").then(v => v.MyNestedUI),
    }),
    // Catch ummatched routes and redirect upward
    new Redirect("../"),
  ],
});

/**
 * To enable your routes to be matched by the engine, you can
 * provide them to the engine's `Hierarchy`:
 */
Hierarchy.define([myPageRoutes /* any other routes*/]);
```

### Route Matching

To match routes based on a URL you can then call

```typescript
Hierarchy.match("/path/in/my/app");
```

This will resolve the path against your available routes/redirects and return the routes matched in order of depth.

With the returned matches, your framework or app can then render the corresponding UI hierarchy

A simple non-async vanilla JS implementation could look something like:

```typescript
const routerOutlet = document.getElementById("outlet");

// get the currently matched routes
const nodes = await Hierarchy.match("/path/in/my/app");

// grab a reference to the current root-level match
let current = nodes.shift();

// replace the child at the root of the router
routerOutlet.replaceChildren(current.route.compoennt);

// append each matched route node's UI into the
// node that came before it
nodes.forEach(node => {
  current.component.appendChild(node.route.component);
  current = node;
});

// Your page is built!
```

### Route Definitions

Route definitions are designed to be similar to those found in Angular/React router. Along with paths and UI components, route definitions support collocating data requirements and asynchronously loading JavaScript driven UI code

```typescript
const MyRoute = new Route({
  path: "my-path";
  component?: SynchronousComponent
  loader?: () => import("async-component"),
  parallelized?: [/*
    data-loaders/function to invoke in parallel with your route
  */],
  accessControls?: [/**
    * functions to call specifying whether access can be granted
    * to the route
  */],
  children?: [/* Child Routes */]
});

// Register the route and its children
Hierarchy.define([MyRoute]);
```
