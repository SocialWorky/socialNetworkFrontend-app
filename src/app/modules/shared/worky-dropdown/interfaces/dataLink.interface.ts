export interface DropdownDataLink<T> {
  icon?: string;
  link?: string;
  function?: (...args: T[]) => any;
  title: string;
}
