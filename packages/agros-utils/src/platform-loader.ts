export const loadPlatform = <T>(platformName: string): T => {
    let Platform = require(require.resolve(platformName, {
        paths: [
            process.cwd(),
        ],
    }));

    if (Platform) {
        Platform = Platform.default || Platform;
    } else {
        return null;
    }

    return new Platform();
};
