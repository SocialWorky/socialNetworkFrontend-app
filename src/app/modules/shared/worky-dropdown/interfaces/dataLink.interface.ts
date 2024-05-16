export interface DropdownDataLink<T> {
  link?: string;
  function?: (...args: T[]) => any;
  title: string;
}
