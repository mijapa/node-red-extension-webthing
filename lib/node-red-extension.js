"use strict";
/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRedExtension = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const node_red_1 = __importDefault(require("node-red"));
const util_1 = require("@node-red/util");
const http_1 = __importDefault(require("http"));
class NodeRedExtension {
    // eslint-disable-next-line no-unused-vars
    constructor(addonManager, config) {
        this.addonManager = addonManager;
        this.config = config;
        this.initializeNodeRed();
    }
    defaultLocalGateway() {
        if (!this.config.gateway) {
            this.config.gateway = {};
        }
        return {
            type: 'webthingsio-gateway',
            name: this.config.gateway.name || 'Local',
            host: this.config.gateway.host || '127.0.0.1',
            port: this.config.gateway.port || 8080,
            https: this.config.gateway.https,
            accessToken: this.config.gateway.accessToken,
            skipValidation: this.config.gateway.skipValidation,
        };
    }
    initializeNodeRed() {
        if (!this.config.nodeRed) {
            this.config.nodeRed = {};
        }
        if (this.config.nodeRed.host) {
            const location = `${this.config.nodeRed.host}:${this.config.nodeRed.port}`;
            // eslint-disable-next-line max-len
            console.warn(`Not starting a local Node-RED instance, but using the one hosted at ${location}! Please note that I cannot apply gateway specific options there :\\`);
            return;
        }
        const dataDir = this.addonManager.userProfile.dataDir;
        const path = `${dataDir}/node-red-extension/`;
        if (!fs_1.default.existsSync(path)) {
            fs_1.default.mkdirSync(path);
        }
        process.env.NODE_RED_HOME = path;
        process.env.HOME = path;
        process.env.USERPROFILE = path;
        process.env.HOMEPATH = path;
        if (this.config.nodeRed.debug) {
            process.env.DEBUG = '*';
        }
        const app = express_1.default();
        const defaultSettings = {
            httpRoot: '/',
            httpAdminRoot: '/',
            httpNodeRoot: '/',
            uiHost: '0.0.0.0',
            uiPort: this.config.nodeRed.port || 1880,
            webthingsioGatewayReconnectInterval: this.config.nodeRed.reconnectInterval || 5,
            webthingsioGatewayShorterLabels: this.config.nodeRed.shorterLabels,
            webthingsioGatewayLimitInputLen: this.config.nodeRed.limitInputLen || 15,
            editorTheme: {
               projects: {
                   enabled: true
                         }
                         },
            flowFilePretty: true,
        };
        let customSettings = {};
        try {
            customSettings = JSON.parse(this.config.nodeRed.settings);
        }
        catch (ex) {
            console.info('No custom Node-RED settings specified!');
        }
        const settings = Object.assign(Object.assign({}, defaultSettings), customSettings);
        const server = http_1.default.createServer((req, res) => {
            app(req, res);
        });
        server.setMaxListeners(0);
        node_red_1.default.init(server, settings);
        app.use(settings.httpAdminRoot, node_red_1.default.httpAdmin);
        app.use(settings.httpNodeRoot, node_red_1.default.httpNode);
        node_red_1.default.start().then(() => __awaiter(this, void 0, void 0, function* () {
            console.info('Node-RED running!');
            server.on('error', (err) => {
                console.error('Server error:', err);
            });
            server.listen(settings.uiPort, settings.uiHost, () => {
                console.info('Node-RED server listening!');
                setTimeout(() => {
                    this.addGatewayNode();
                }, 1000);
            });
        }));
    }
    addGatewayNode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.gateway || !this.config.gateway.accessToken) {
                // eslint-disable-next-line max-len
                console.warn('Not generating a local configuration node. Please consider adding an access token to the add-on config.');
                return;
            }
            const globalflow = yield node_red_1.default.runtime.flows.getFlow({
                id: 'global',
            });
            let configs = globalflow.configs;
            if (!configs) {
                configs = [];
                globalflow.configs = configs;
            }
            const localgateways = configs.filter((node) => {
                return node.type === 'webthingsio-gateway' &&
                    node.name === this.defaultLocalGateway().name;
            });
            if (localgateways.length === 0) {
                console.info('Adding configuration node for local gateway');
                configs.push(Object.assign({ id: util_1.util.generateId() }, this.defaultLocalGateway()));
            }
            else {
                console.info('Updating configuration node for local gateway');
                Object.assign(localgateways[0], this.defaultLocalGateway());
            }
            node_red_1.default.runtime.flows.updateFlow({
                id: globalflow.id,
                flow: globalflow,
            });
        });
    }
}
exports.NodeRedExtension = NodeRedExtension;
//# sourceMappingURL=node-red-extension.js.map
