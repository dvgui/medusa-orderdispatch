"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _OrderDispatchClient_instances, _OrderDispatchClient_credentials, _OrderDispatchClient_baseUrl, _OrderDispatchClient_timeoutMs, _OrderDispatchClient_fetch, _OrderDispatchClient_now, _OrderDispatchClient_token, _OrderDispatchClient_login, _OrderDispatchClient_getToken, _OrderDispatchClient_authenticate, _OrderDispatchClient_request, _OrderDispatchClient_send;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderDispatchClient = exports.jwtExpiresAt = exports.OrderDispatchError = void 0;
const constants_1 = require("../../constants");
class OrderDispatchError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "OrderDispatchError";
    }
}
exports.OrderDispatchError = OrderDispatchError;
/** Refresh this long before the JWT's `exp` (ODM issues 20-hour tokens). */
const TOKEN_REFRESH_MARGIN_MS = 5 * 60_000;
/** When a token carries no readable `exp`, trust it for an hour. */
const TOKEN_FALLBACK_TTL_MS = 60 * 60_000;
/** The JWT's `exp` in epoch ms, or undefined when it can't be read. */
const jwtExpiresAt = (token) => {
    const [, payload] = token.split(".");
    if (!payload)
        return undefined;
    try {
        const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        return typeof exp === "number" ? exp * 1000 : undefined;
    }
    catch {
        return undefined;
    }
};
exports.jwtExpiresAt = jwtExpiresAt;
/**
 * OrderDispatch API client. Authenticates with a dashboard user (ODM has no
 * API keys), caches the JWT until shortly before it expires, and re-logs once
 * on a 401. Error messages never include credentials.
 */
class OrderDispatchClient {
    constructor({ username, password, baseUrl, timeoutMs, fetchImpl, now }) {
        _OrderDispatchClient_instances.add(this);
        _OrderDispatchClient_credentials.set(this, void 0);
        _OrderDispatchClient_baseUrl.set(this, void 0);
        _OrderDispatchClient_timeoutMs.set(this, void 0);
        _OrderDispatchClient_fetch.set(this, void 0);
        _OrderDispatchClient_now.set(this, void 0);
        _OrderDispatchClient_token.set(this, void 0);
        _OrderDispatchClient_login.set(this, void 0);
        if (!username || !password) {
            throw new OrderDispatchError("OrderDispatch username and password are required");
        }
        __classPrivateFieldSet(this, _OrderDispatchClient_credentials, { username, password }, "f");
        __classPrivateFieldSet(this, _OrderDispatchClient_baseUrl, (baseUrl || constants_1.ORDERDISPATCH_DEFAULT_BASE_URL).replace(/\/+$/, ""), "f");
        __classPrivateFieldSet(this, _OrderDispatchClient_timeoutMs, timeoutMs ?? 20_000, "f");
        __classPrivateFieldSet(this, _OrderDispatchClient_fetch, fetchImpl ?? fetch, "f");
        __classPrivateFieldSet(this, _OrderDispatchClient_now, now ?? Date.now, "f");
    }
    async createOrder(order, { source, subSource }) {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "POST", "/api/CreateOrder/Create", {
            query: { source, subSource },
            body: order,
        });
        if (!response.IsSuccessfull || !response.OrderNumber) {
            throw new OrderDispatchError(`OrderDispatch rejected order ${order.ShippingDetails.ReferenceNumber}: ${response.Error || "no order number returned"}`);
        }
        return { ...response, OrderNumber: response.OrderNumber };
    }
    async getStockLevels() {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "GET", "/api/InventoryPreview/GetStockLevels");
        if (!response.Success)
            throw new OrderDispatchError("OrderDispatch GetStockLevels was not successful");
        return response.StockLevels ?? [];
    }
    async getProcessedOrders() {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "GET", "/api/ProcessedOrders/GetProcessedOrders");
        if (!response.Success)
            throw new OrderDispatchError("OrderDispatch GetProcessedOrders was not successful");
        return response.ProcessedOrders ?? [];
    }
    /** Stock items whose SKU, title or barcode contains `text` (with StockItemId). */
    async searchStockItems(text) {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "GET", "/Api/AmazonFBAInventorySearch/Search", {
            query: { text, ignoreComposite: "true" },
        });
        return Array.isArray(response) ? response : [];
    }
    /** ODM's country names; CreateOrder's Country must be one of them. */
    async getCountries() {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "GET", "/api/CreateOrder/GetCountries");
        return Array.isArray(response) ? response : [];
    }
    /** `weightKg` per ODM: kilograms. */
    async getShippingRates(country, weightKg) {
        const response = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, "GET", "/api/Shipping/GetShippingRates", {
            query: { country: country.toUpperCase(), weight: String(weightKg) },
        });
        return response.Rates ?? [];
    }
}
exports.OrderDispatchClient = OrderDispatchClient;
_OrderDispatchClient_credentials = new WeakMap(), _OrderDispatchClient_baseUrl = new WeakMap(), _OrderDispatchClient_timeoutMs = new WeakMap(), _OrderDispatchClient_fetch = new WeakMap(), _OrderDispatchClient_now = new WeakMap(), _OrderDispatchClient_token = new WeakMap(), _OrderDispatchClient_login = new WeakMap(), _OrderDispatchClient_instances = new WeakSet(), _OrderDispatchClient_getToken = async function _OrderDispatchClient_getToken() {
    if (__classPrivateFieldGet(this, _OrderDispatchClient_token, "f") && __classPrivateFieldGet(this, _OrderDispatchClient_now, "f").call(this) < __classPrivateFieldGet(this, _OrderDispatchClient_token, "f").refreshAt)
        return __classPrivateFieldGet(this, _OrderDispatchClient_token, "f").value;
    // One login for every caller that arrives while it is in flight.
    __classPrivateFieldSet(this, _OrderDispatchClient_login, __classPrivateFieldGet(this, _OrderDispatchClient_login, "f") ?? __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_authenticate).call(this).finally(() => {
        __classPrivateFieldSet(this, _OrderDispatchClient_login, undefined, "f");
    }), "f");
    return __classPrivateFieldGet(this, _OrderDispatchClient_login, "f");
}, _OrderDispatchClient_authenticate = async function _OrderDispatchClient_authenticate() {
    const res = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_send).call(this, "POST", "/api/Auth/ValidateUser", { body: __classPrivateFieldGet(this, _OrderDispatchClient_credentials, "f") });
    if (!res.ok) {
        throw new OrderDispatchError(`OrderDispatch login failed (HTTP ${res.status})`, res.status);
    }
    const { token } = (await res.json());
    if (typeof token !== "string" || !token) {
        throw new OrderDispatchError("OrderDispatch login returned no token");
    }
    const expiresAt = (0, exports.jwtExpiresAt)(token) ?? __classPrivateFieldGet(this, _OrderDispatchClient_now, "f").call(this) + TOKEN_FALLBACK_TTL_MS;
    __classPrivateFieldSet(this, _OrderDispatchClient_token, { value: token, refreshAt: expiresAt - TOKEN_REFRESH_MARGIN_MS }, "f");
    return token;
}, _OrderDispatchClient_request = async function _OrderDispatchClient_request(method, path, init = {}, retried = false) {
    const token = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_getToken).call(this);
    const res = await __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_send).call(this, method, path, init, token);
    if (res.status === 401 && !retried) {
        __classPrivateFieldSet(this, _OrderDispatchClient_token, undefined, "f");
        return __classPrivateFieldGet(this, _OrderDispatchClient_instances, "m", _OrderDispatchClient_request).call(this, method, path, init, true);
    }
    if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        throw new OrderDispatchError(`OrderDispatch ${method} ${path} failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`, res.status);
    }
    return (await res.json());
}, _OrderDispatchClient_send = async function _OrderDispatchClient_send(method, path, { query, body }, token) {
    const url = new URL(`${__classPrivateFieldGet(this, _OrderDispatchClient_baseUrl, "f")}${path}`);
    for (const [key, value] of Object.entries(query ?? {}))
        url.searchParams.set(key, value);
    try {
        return await __classPrivateFieldGet(this, _OrderDispatchClient_fetch, "f").call(this, url, {
            method,
            headers: {
                Accept: "application/json",
                ...(body === undefined ? {} : { "Content-Type": "application/json" }),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(__classPrivateFieldGet(this, _OrderDispatchClient_timeoutMs, "f")),
        });
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new OrderDispatchError(`OrderDispatch ${method} ${path} did not respond: ${reason}`);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2xpYi9vcmRlcmRpc3BhdGNoLWNsaWVudC9jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWdFO0FBZ0JoRSxNQUFhLGtCQUFtQixTQUFRLEtBQUs7SUFDM0MsWUFDRSxPQUFlLEVBQ04sTUFBZTtRQUV4QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFGTCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBR3hCLElBQUksQ0FBQyxJQUFJLEdBQUcsb0JBQW9CLENBQUE7SUFDbEMsQ0FBQztDQUNGO0FBUkQsZ0RBUUM7QUFZRCw0RUFBNEU7QUFDNUUsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFBO0FBQzFDLG9FQUFvRTtBQUNwRSxNQUFNLHFCQUFxQixHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUE7QUFFekMsdUVBQXVFO0FBQ2hFLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBYSxFQUFzQixFQUFFO0lBQ2hFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEMsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFPLFNBQVMsQ0FBQTtJQUM5QixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQXNCLENBQUE7UUFDbkcsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUN6RCxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1AsT0FBTyxTQUFTLENBQUE7SUFDbEIs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