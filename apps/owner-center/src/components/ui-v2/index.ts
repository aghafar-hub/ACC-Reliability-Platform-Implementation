// apps/owner-center/src/components/ui-v2/index.ts
// UI-V2 premium industrial component set — barrel export.
// Additive namespace: does not replace apps/owner-center/src/components/ui.

export { PlatformHeader } from './PlatformHeader';
export type { PlatformHeaderProps } from './PlatformHeader';

export { KpiTile } from './KpiTile';
export type { KpiTileProps } from './KpiTile';

export { StatusChip } from './StatusChip';
export type { StatusChipProps } from './StatusChip';

export { Panel } from './Panel';
export type { PanelProps } from './Panel';

export { DataTable } from './DataTable';
export type { DataTableV2Props } from './DataTable';

export { FilterBar } from './FilterBar';
export type { FilterBarV2Props } from './FilterBar';

export { Accordion } from './Accordion';
export type { AccordionProps } from './Accordion';

export { DonutChart } from './charts/DonutChart';
export type { DonutChartProps, DonutSlice } from './charts/DonutChart';

export { LineChart } from './charts/LineChart';
export type { LineChartProps } from './charts/LineChart';

export { BarChart } from './charts/BarChart';
export type { BarChartProps, BarGroup } from './charts/BarChart';

export { cn } from './types';
export type { Severity, FilterFieldConfigV2, FilterSelectOption, DataTableColumnV2 } from './types';
