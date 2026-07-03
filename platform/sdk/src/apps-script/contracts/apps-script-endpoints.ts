// platform/sdk/src/apps-script/contracts/apps-script-endpoints.ts
// Canonical Apps Script endpoint identifiers for master-data operations.

/** All supported Apps Script master-data endpoint names. */
export type AppsScriptEndpoint =
  | 'equipment.list'
  | 'equipment.get'
  | 'lp.list'
  | 'lp.get'
  | 'lp.upsert'
  | 'lp.deactivate';

export const APPS_SCRIPT_ENDPOINTS = {
  equipment: {
    list: 'equipment.list',
    get: 'equipment.get',
  },
  lp: {
    list: 'lp.list',
    get: 'lp.get',
    upsert: 'lp.upsert',
    deactivate: 'lp.deactivate',
  },
} as const satisfies {
  readonly equipment: { readonly list: AppsScriptEndpoint; readonly get: AppsScriptEndpoint };
  readonly lp: {
    readonly list: AppsScriptEndpoint;
    readonly get: AppsScriptEndpoint;
    readonly upsert: AppsScriptEndpoint;
    readonly deactivate: AppsScriptEndpoint;
  };
};
