declare module 'react' {
  export = React;
}

declare module 'react/jsx-runtime' {
  const jsx: any;
  export default jsx;
}

declare module 'react-dom/client' {
  const createRoot: any;
  export { createRoot };
}
/// <reference types="react" />
/// <reference types="react-dom" />
