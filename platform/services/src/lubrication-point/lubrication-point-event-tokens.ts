// platform/services/src/lubrication-point/lubrication-point-event-tokens.ts

import { EventToken } from '@acc-reliability/kernel';
import type { LpUpdatedPayload, LpDeactivatedPayload } from '../contracts/platform-events';

export const LP_UPDATED_TOKEN =
  new EventToken<LpUpdatedPayload>('platform.master-data.lp.updated');

export const LP_DEACTIVATED_TOKEN =
  new EventToken<LpDeactivatedPayload>('platform.master-data.lp.deactivated');
