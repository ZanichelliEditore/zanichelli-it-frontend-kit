import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'zanichelli-it-frontend-kit',
  globalStyle: 'src/style.css',
  validatePrimaryPackageOutputTarget: true,
  outputTargets: [
    {
      type: 'dist',
      empty: true,
      isPrimaryPackageOutputTarget: true,
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      generateTypeDeclarations: true,
      externalRuntime: false,
      empty: true,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      empty: true,
    },
  ],
  extras: {
    enableImportInjection: true,
  },
};
