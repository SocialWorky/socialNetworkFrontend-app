export interface DropdownDataLink<T> {
  title: string;
  icon?: string;
  img?: string;
  link?: string;
  color?: string;
  linkUrl?: string;
  function?: (...args: T[]) => any;
  isVersionInfo?: boolean;
}
