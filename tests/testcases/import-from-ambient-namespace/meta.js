export default {
  options: { 
    exportAsGlobalNamespace: true,
    respectExternal: true,
  },
  rollupOptions: {
    external: [/.*lib.*/],
  },
  singlePass: true
};
