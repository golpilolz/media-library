module.exports = {
    presets: [
        ['@babel/preset-env', {
            "loose": true,
            "modules": false,
            // AssetMapper serves native ES modules: no need to transpile below that.
            "targets": {"esmodules": true}
        }],
        ['@babel/preset-typescript', { allowDeclareFields: true }]
    ],
    assumptions: {
        superIsCallableConstructor: false,
    },
};
