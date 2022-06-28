declare module 'bole' {
  function logger(name: string): typeof logger;
  namespace logger {
    function debug(...args: any[]): void;
    function info(...args: any[]): void;
    function warn(...args: any[]): void;
    function error(...args: any[]): void;
  }

  function bole(name: string): typeof logger;
  namespace bole {
    function output(args: {level: string; stream: any}): void;
  }

  export default bole;
}
