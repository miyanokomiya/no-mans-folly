"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
var playwright = require("playwright");
// Ref: https://github.com/microsoft/playwright-mcp/blob/main/src/context.ts
var Context = /** @class */ (function () {
    function Context() {
        this._console = [];
    }
    Context.prototype.createPage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this._createPagePromise)
                    return [2 /*return*/, this._createPagePromise];
                this._createPagePromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, browser, page;
                    var _this = this;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, this._createPage()];
                            case 1:
                                _a = _b.sent(), browser = _a.browser, page = _a.page;
                                page.on("console", function (event) { return _this._console.push(event); });
                                page.on("framenavigated", function (frame) {
                                    if (!frame.parentFrame())
                                        _this._console.length = 0;
                                });
                                page.on("close", function () { return _this._onPageClose(); });
                                page.setDefaultNavigationTimeout(60000);
                                page.setDefaultTimeout(5000);
                                this._page = page;
                                this._browser = browser;
                                return [2 /*return*/, page];
                        }
                    });
                }); })();
                return [2 /*return*/, this._createPagePromise];
            });
        });
    };
    Context.prototype._onPageClose = function () {
        var _a;
        var browser = this._browser;
        var page = this._page;
        void ((_a = page === null || page === void 0 ? void 0 : page.context()) === null || _a === void 0 ? void 0 : _a.close().then(function () { return browser === null || browser === void 0 ? void 0 : browser.close(); }).catch(function () { }));
        this._createPagePromise = undefined;
        this._browser = undefined;
        this._page = undefined;
        this._console.length = 0;
    };
    Context.prototype.existingPage = function () {
        if (!this._page)
            throw new Error("Navigate to a location to create a page");
        return this._page;
    };
    Context.prototype.console = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._console];
            });
        });
    };
    Context.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, ((_a = this._page) === null || _a === void 0 ? void 0 : _a.close())];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Context.prototype._createPage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var browser, context, page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, playwright.chromium.launch({ headless: false, devtools: false })];
                    case 1:
                        browser = _a.sent();
                        return [4 /*yield*/, browser.newContext({
                                baseURL: "http://localhost:5173",
                                screen: { width: 500, height: 500 },
                            })];
                    case 2:
                        context = _a.sent();
                        page = context.pages()[0];
                        return [2 /*return*/, { page: page }];
                }
            });
        });
    };
    return Context;
}());
exports.Context = Context;
