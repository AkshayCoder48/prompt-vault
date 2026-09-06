"use client";

import { create } from "zustand";

export type Route =
  | { name: "home" }
  | { name: "search"; q?: string; category?: string; tag?: string; sort?: string }
  | { name: "prompt"; id: string }
  | { name: "category"; slug: string }
  | { name: "categories" }
  | { name: "trending" }
  | { name: "latest" }
  | { name: "saved" }
  | { name: "about" }
  | { name: "lab" }
  | { name: "admin" };

interface AppState {
  route: Route;
  visitorId: string | null;
  savedIds: string[];
  searchQuery: string;
  navigate: (route: Route) => void;
  setVisitorId: (id: string) => void;
  toggleSaved: (id: string) => void;
  setSearchQuery: (q: string) => void;
}

function getInitialRoute(): Route {
  if (typeof window === "undefined") return { name: "home" };
  const hash = window.location.hash.replace(/^#\/?/, "");
  return parseHash(hash);
}

function parseHash(hash: string): Route {
  const [path, query = ""] = hash.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(query);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "search")
    return {
      name: "search",
      q: params.get("q") || undefined,
      category: params.get("category") || undefined,
      tag: params.get("tag") || undefined,
      sort: params.get("sort") || undefined,
    };
  if (parts[0] === "prompt" && parts[1]) return { name: "prompt", id: parts[1] };
  if (parts[0] === "category" && parts[1]) return { name: "category", slug: parts[1] };
  if (parts[0] === "categories") return { name: "categories" };
  if (parts[0] === "trending") return { name: "trending" };
  if (parts[0] === "latest") return { name: "latest" };
  if (parts[0] === "saved") return { name: "saved" };
  if (parts[0] === "about") return { name: "about" };
  if (parts[0] === "lab") return { name: "lab" };
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "home" };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "search": {
      const p = new URLSearchParams();
      if (route.q) p.set("q", route.q);
      if (route.category) p.set("category", route.category);
      if (route.tag) p.set("tag", route.tag);
      if (route.sort) p.set("sort", route.sort);
      return `#/search?${p.toString()}`;
    }
    case "prompt":
      return `#/prompt/${route.id}`;
    case "category":
      return `#/category/${route.slug}`;
    case "categories":
      return "#/categories";
    case "trending":
      return "#/trending";
    case "latest":
      return "#/latest";
    case "saved":
      return "#/saved";
    case "about":
      return "#/about";
    case "lab":
      return "#/lab";
    case "admin":
      return "#/admin";
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  route: { name: "home" },
  visitorId: null,
  savedIds: [],
  searchQuery: "",
  navigate: (route) => {
    if (typeof window !== "undefined") {
      window.location.hash = routeToHash(route).replace(/^#/, "");
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
    set({ route });
  },
  setVisitorId: (id) => set({ visitorId: id }),
  toggleSaved: (id) =>
    set((s) => ({
      savedIds: s.savedIds.includes(id)
        ? s.savedIds.filter((x) => x !== id)
        : [...s.savedIds, id],
    })),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));

// hydrate route from hash on the client
if (typeof window !== "undefined") {
  const init = getInitialRoute();
  useAppStore.setState({ route: init });
  // load saved ids from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem("pv_saved") || "[]");
    if (Array.isArray(saved)) useAppStore.setState({ savedIds: saved });
    const vid = localStorage.getItem("pv_visitor_id");
    if (vid) useAppStore.setState({ visitorId: vid });
  } catch {
    /* ignore */
  }
  // listen to hashchange (back/forward)
  window.addEventListener("hashchange", () => {
    const r = parseHash(window.location.hash.replace(/^#\/?/, ""));
    useAppStore.setState({ route: r });
    window.scrollTo({ top: 0 });
  });
}
