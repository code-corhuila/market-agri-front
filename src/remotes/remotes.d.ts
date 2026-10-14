// The modules each portal exposes through Module Federation (ADR-021): its root component.
declare module 'auth/App' {
  const App: import('react').ComponentType;
  export default App;
}
declare module 'catalog/App' {
  const App: import('react').ComponentType;
  export default App;
}
declare module 'transactions/App' {
  const App: import('react').ComponentType;
  export default App;
}
