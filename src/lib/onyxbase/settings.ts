import { getOnyxBase, COLLECTIONS } from "./client";
import type { SiteConfig } from "./types";

const CONFIG_KEY = "site:config";

const DEFAULT_CONFIG: SiteConfig = {
  siteName: "PromptVault",
  siteDescription: "Discover high-quality AI prompts that actually work.",
  logo: null,
  favicon: null,
  maintenanceMode: false,
  commentsEnabled: true,
  adsEnabled: true,
  homepageTitle: "Discover prompts that actually work.",
  homepageDescription:
    "Browse, copy, and share premium AI prompts for art, writing, coding, marketing and more.",
  featuredPromptIds: [],
  adPlacements: {
    header: true,
    homepageFeed: true,
    promptInline: true,
    sidebar: false,
    footer: true,
    searchResults: true,
  },
  adminPassword: "",          // empty = admin login disabled. Set in Onyx Base.
  adminAccessKey: null,       // secret URL key to reach the admin panel. Set in Onyx Base.
};

export const settingsService = {
  async get(): Promise<SiteConfig> {
    const ob = getOnyxBase();
    const rec = await ob.get<SiteConfig>(COLLECTIONS.config, CONFIG_KEY);
    if (!rec) {
      // first boot — persist defaults
      await ob.set(COLLECTIONS.config, CONFIG_KEY, { ...DEFAULT_CONFIG, createdAt: new Date().toISOString() });
      return { ...DEFAULT_CONFIG };
    }
    // merge with defaults so new fields appear without re-seeding
    return {
      ...DEFAULT_CONFIG,
      ...rec.value,
      adPlacements: { ...DEFAULT_CONFIG.adPlacements, ...(rec.value.adPlacements || {}) },
    };
  },

  async update(patch: Partial<SiteConfig>): Promise<SiteConfig> {
    const current = await this.get();
    const updated: SiteConfig = {
      ...current,
      ...patch,
      adPlacements: { ...current.adPlacements, ...(patch.adPlacements || {}) },
    };
    await getOnyxBase().set(COLLECTIONS.config, CONFIG_KEY, updated);
    return updated;
  },

  isAdPlacementEnabled(config: SiteConfig, placement: keyof SiteConfig["adPlacements"]): boolean {
    return config.adsEnabled && config.adPlacements[placement];
  },
};
