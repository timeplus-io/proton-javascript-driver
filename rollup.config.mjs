import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'ProtonDriver',
            sourcemap: true,
        },
        {
            file: 'dist/index.umd.min.js',
            format: 'umd',
            name: 'ProtonDriver',
            plugins: [terser()],
            sourcemap: true,
        },
    ],
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                module: 'ESNext',
            },
            declaration: false,
        }),
    ],
};
