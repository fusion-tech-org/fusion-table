import { defineConfig } from 'tsup';
// import { visualizer } from 'rollup-plugin-visualizer';
// import pkg from './package.json';

const handleBuildSuccess = async () => {
  console.log('oops! building successfully');
};

export default defineConfig({
  entry: ['src/index.tsx'],
  outExtension() {
    return {
      // js: `.${pkg.version}.min.js`,
      js: `.min.js`,
    };
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: 'lib',
  minify: 'terser',
  treeshake: true,
  onSuccess: handleBuildSuccess,
  external: ['react', 'react-dom', 'lodash', '@arco-design/web-react'],
  platform: 'browser',
  format: 'esm',
  dts: true,
  publicDir: 'public',
  metafile: false,
});
