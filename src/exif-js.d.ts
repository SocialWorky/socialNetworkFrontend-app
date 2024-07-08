declare module 'exif-js' {
  export function getData(img: any, callback: () => void): void;
  export function getTag(img: any, tag: string): any;
  export function getAllTags(img: any): any;
  export function readFromBinaryFile(file: ArrayBuffer): any;
}
