const addLessLoader = require('customize-cra-less-loader');

module.exports = {
    builder: [
        addLessLoader({
            lessLoaderOptions: {
                lessOptions: {
                    javascriptEnabled: true,
                },
            },
        }),
    ],
};
