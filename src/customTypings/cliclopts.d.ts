declare module 'cliclopts' {
  export type Argument = {
    name: string;
    abbr: string;
    default?: any;
    help?: string;
    boolean?: boolean;
  };

  function cliclopts(args: Argument[]): any;

  export default cliclopts;
}
