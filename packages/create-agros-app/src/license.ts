import * as path from 'path';
import * as fs from 'fs-extra';

export interface LicenseProps {
    description: string;
    user: string;
    year?: string;
}

interface LicenseMapItem {
    name: string;
    fullName: string;
    placeholders: Required<LicenseProps>;
}

export class LicenseUtils {
    protected licenseFilesDir: string;
    protected licenseConfigMap: Record<string, LicenseMapItem> = {};
    protected licenses: Record<string, string> = {};
    private liceDir: string;

    public constructor() {
        try {
            this.liceDir = path.dirname(require.resolve('lice'));
            this.licenseFilesDir = path.resolve(this.liceDir, 'licenses');
            this.licenseConfigMap = require(path.resolve(this.liceDir, 'lib/licenses')) || {};
            this.licenses = fs.readdirSync(this.licenseFilesDir).reduce((result, filename) => {
                try {
                    const filePathname = path.resolve(this.licenseFilesDir, filename);
                    if (fs.statSync(filePathname).isFile()) {
                        const licenseKey = filename.replace(new RegExp(path.extname(filename) + '$', 'gi'), '');
                        result[licenseKey] = fs.readFileSync(filePathname).toString();
                    }
                } catch (e) {}
                return result;
            }, {} as Record<string, string>) || {};
        } catch (e) {}
    }

    public getLicenseList() {
        return Object.keys(this.licenseConfigMap).map((key) => {
            return {
                name: this.licenseConfigMap[key].name,
                value: key,
            };
        });
    }

    public getLicenseName(type) {
        return this.licenseConfigMap[type].name;
    }

    public generate(type: string, props: LicenseProps) {
        const licenseConfig = this.licenseConfigMap[type];
        let licenseText = this.licenses[type];

        if (!licenseConfig || !licenseText) {
            return;
        }

        Object.keys(licenseConfig.placeholders).forEach((key) => {
            const value = props[key];
            const regex = licenseConfig.placeholders[key];

            if (!regex) {
                return;
            }

            licenseText = licenseText.replace(new RegExp(regex), value);
        });

        return licenseText;
    }
}
