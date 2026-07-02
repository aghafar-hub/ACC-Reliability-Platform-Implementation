// platform/services/src/equipment/equipment-event-tokens.ts

import { EventToken } from '@acc-reliability/kernel';
import type { EquipmentUpdatedPayload } from '../contracts/platform-events';

export const EQUIPMENT_UPDATED_TOKEN =
  new EventToken<EquipmentUpdatedPayload>('platform.master-data.equipment.updated');
