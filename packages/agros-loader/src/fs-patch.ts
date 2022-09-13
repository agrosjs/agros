/* eslint-disable @typescript-eslint/no-invalid-this */
import path from 'path';
const NS = __filename;

export function patch(fs) {
    if (fs[NS]) {
        return;
    }

    const virtualFS = {
        files: {},
        add(options) {
            const file = path.resolve(options.path);
            virtualFS.files[file] = {
                path: file,
                content: options.content,
            };
            return file;
        },
    };
    fs[NS] = virtualFS;

    createPatchFn(fs, 'readFile', function (orig, args, file, defaultEncoding, callback) {
        let encoding = defaultEncoding;
        let cb = callback;
        let rfile = path.resolve(file);
        let vfile = virtualFS.files[rfile];
        if (vfile) {
            if (typeof (encoding) === 'function') {
                cb = encoding;
                encoding = null;
            }
            let content = vfile.content;
            if (encoding !== null) {
                content = content.toString(encoding);
            }
            cb(null, content);
            return;
        }
        return orig.apply(this, args);
    });

    createPatchFn(fs, 'readFileSync', function (orig, args, file, defaultEncoding) {
        let encoding = defaultEncoding;
        let rfile = path.resolve(file);
        let vfile = virtualFS.files[rfile];
        if (vfile) {
            let content = vfile.content;
            if (encoding !== null) {
                content = content.toString(encoding);
            }
            return content;
        }
        return orig.apply(this, args);
    });

    createPatchFn(fs, 'stat', function (orig, args, p, cb) {
        let rp = path.resolve(p);
        let vfile = virtualFS.files[rp];
        if (vfile) {
            let vstat = {
                dev: 8675309,
                nlink: 1,
                uid: 501,
                gid: 20,
                rdev: 0,
                blksize: 4096,
                ino: 44700000,
                mode: 33188,
                size: vfile.content.length,
                isFile() {
                    return true;
                },
                isDirectory() {
                    return false;
                },
                isBlockDevice() {
                    return false;
                },
                isCharacterDevice() {
                    return false;
                },
                isSymbolicLink() {
                    return false;
                },
                isFIFO() {
                    return false;
                },
                isSocket() {
                    return false;
                },
            };
            cb(null, vstat);
            return;
        }
        return orig.apply(this, args);
    });
    createPatchFn(fs, 'statSync', function (orig, args, p) {
        let rp = path.resolve(p);
        let vfile = virtualFS.files[rp];
        if (vfile) {
            let vstat = {
                dev: 8675309,
                nlink: 1,
                uid: 501,
                gid: 20,
                rdev: 0,
                blksize: 4096,
                ino: 44700000,
                mode: 33188,
                size: vfile.content.length,
                isFile() {
                    return true;
                },
                isDirectory() {
                    return false;
                },
                isBlockDevice() {
                    return false;
                },
                isCharacterDevice() {
                    return false;
                },
                isSymbolicLink() {
                    return false;
                },
                isFIFO() {
                    return false;
                },
                isSocket() {
                    return false;
                },
            };
            return vstat;
        }
        return orig.apply(this, args);
    });
}

export function add(fs, options) {
    patch(fs);
    fs[NS].add(options);
}

function createPatchFn(obj, name, fn) {
    const origin = obj[name];
    obj[name] = function () {
        const args = Array.prototype.slice.call(arguments);
        return fn.apply(this, [origin, args].concat(args));
    };
}
