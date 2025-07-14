export enum WidgetPosition {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top'
}

export enum WidgetStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled'
}

export interface WidgetConfig {
  selector: string;
  name: string;
  description: string;
  position: WidgetPosition;
  order: number;
  status: WidgetStatus;
  allowedPositions: WidgetPosition[];
  icon?: string;
}

export interface WidgetLayout {
  top: WidgetConfig[];
  left: WidgetConfig[];
  right: WidgetConfig[];
}
