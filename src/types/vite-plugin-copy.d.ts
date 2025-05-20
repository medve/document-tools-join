declare module 'vite-plugin-copy' {
  interface CopyTarget {
    src: string;
    dest: string;
    rename?: string;
  }

  interface CopyOptions {
    targets: CopyTarget[];
  }

  function copy(options: CopyOptions): unknown;
  export default copy;
} 