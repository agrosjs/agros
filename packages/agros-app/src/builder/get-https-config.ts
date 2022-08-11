import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import paths from './paths';

interface HttpsConfig {
    cert?: Buffer;
    key?: Buffer;
    keyFile?: string;
    crtFile?: string;
}

// Ensure the certificate and key provided are valid and if not
// throw an easy to debug error
const validateKeyAndCerts = ({
    cert,
    key,
    keyFile,
    crtFile,
}: HttpsConfig) => {
    let encrypted;
    try {
        // publicEncrypt will throw an error with an invalid cert
        encrypted = crypto.publicEncrypt(cert, Buffer.from('test'));
    } catch (err) {
        throw new Error(`The certificate "${crtFile}" is invalid.\n${err.message}`);
    }
    try {
        // privateDecrypt will throw an error with an invalid key
        crypto.privateDecrypt(key, encrypted);
    } catch (err) {
        throw new Error(`The certificate key "${keyFile}" is invalid.\n${err.message}`);
    }
};

// Read file and throw an error if it doesn't exist
const readEnvFile = (file, type) => {
    if (!fs.existsSync(file)) {
        throw new Error(`You specified ${type} in your env, but the file "${file}" can't be found.`);
    }
    return fs.readFileSync(file);
};

// Get the https config
// Return cert files if provided in env, otherwise just true or false
export default () => {
    const {
        SSL_CRT_FILE,
        SSL_KEY_FILE,
        HTTPS,
    } = process.env;
    const isHttps = HTTPS === 'true';

    if (isHttps && SSL_CRT_FILE && SSL_KEY_FILE) {
        const crtFile = path.resolve(paths.appPath, SSL_CRT_FILE);
        const keyFile = path.resolve(paths.appPath, SSL_KEY_FILE);
        const config = {
            cert: readEnvFile(crtFile, 'SSL_CRT_FILE'),
            key: readEnvFile(keyFile, 'SSL_KEY_FILE'),
        };

        validateKeyAndCerts({
            ...config,
            keyFile,
            crtFile,
        });

        return config;
    }

    return isHttps;
};
