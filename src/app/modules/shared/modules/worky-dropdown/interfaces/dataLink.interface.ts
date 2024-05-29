export interface DropdownDataLink<T> {
  icon?: string;
  img?: string;
  link?: string;
  linkUrl?: string;
  function?: (...args: T[]) => any;
  title: string;
}