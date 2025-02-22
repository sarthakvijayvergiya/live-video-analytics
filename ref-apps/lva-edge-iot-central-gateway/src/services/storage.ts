const ROOT = '__ROOT__';
import { service, inject } from 'spryly';
import { Server } from '@hapi/hapi';
import * as fse from 'fs-extra';
import {
    resolve as pathResolve
} from 'path';

const moduleName = 'StorageService';

@service('storage')
export class StorageService {
    @inject('$server')
    private server: Server;

    private setupDone = false;
    private storageDirectory: string;

    public async init(): Promise<void> {
        this.server.log([moduleName, 'info'], 'initialize');

        this.storageDirectory = (this.server?.settings?.app as any)?.storageRootDirectory;

        try {
            this.setup();
        }
        catch (ex) {
            this.server.log([moduleName, 'error'], `Exception during storage setup: ${ex.message}`);
        }
    }

    public async get(scope: string, property?: string): Promise<any> {
        if (!property) {
            property = ROOT;
        }

        const obj = await this.readScope(scope);

        if (!obj) {
            return {};
        }

        if (property === ROOT) {
            return obj;
        }

        return obj[property];
    }

    public async set(scope: string, property: any, value?: any): Promise<void> {
        if (!value) {
            value = property;
            property = ROOT;
        }

        const obj = await this.readScope(scope);

        // const finalObject = (property === ROOT)
        //     ? value
        //     : _set(obj || {}, property, value);

        const finalObject = (property === ROOT)
            ? value
            : {
                ...(obj && obj),
                [property]: value
            };

        this.writeScope(scope, finalObject);
    }

    public async flush(scope: string, property: string, value?: any): Promise<void> {
        if (!value) {
            value = property;
            property = ROOT;
        }

        // const finalObject = (property === ROOT)
        //     ? value
        //     : _set({}, property, value);

        const finalObject = (property === ROOT)
            ? value
            : {
                [property]: value
            };

        this.writeScope(scope, finalObject);
    }

    private setup() {
        if (this.setupDone === true) {
            return;
        }

        fse.ensureDirSync(this.storageDirectory);

        this.setupDone = true;
    }

    private async readScope(scope: string): Promise<any> {
        try {
            this.setup();

            const exists = await fse.pathExists(this.getScopePath(scope));
            if (!exists) {
                return {};
            }

            return fse.readJson(this.getScopePath(scope));
        }
        catch (ex) {
            return {};
        }
    }

    private writeScope(scope: string, data: any) {
        try {
            this.setup();

            const writeOptions = {
                spaces: 2,
                throws: false
            };

            fse.writeJsonSync(this.getScopePath(scope), data, writeOptions);
        }
        catch (ex) {
            // eat exception
        }
    }

    private getScopePath(scope: string) {
        return pathResolve(this.storageDirectory, `${scope}.json`);
    }
}
