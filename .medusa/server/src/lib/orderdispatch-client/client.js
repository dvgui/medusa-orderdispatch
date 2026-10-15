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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2xpYi9vcmRlcmRpc3BhdGNoLWNsaWVudC9jbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWdFO0FBZWhFLE1BQWEsa0JBQW1CLFNBQVEsS0FBSztJQUMzQyxZQUNFLE9BQWUsRUFDTixNQUFlO1FBRXhCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUZMLFdBQU0sR0FBTixNQUFNLENBQVM7UUFHeEIsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQTtJQUNsQyxDQUFDO0NBQ0Y7QUFSRCxnREFRQztBQVlELDRFQUE0RTtBQUM1RSxNQUFNLHVCQUF1QixHQUFHLENBQUMsR0FBRyxNQUFNLENBQUE7QUFDMUMsb0VBQW9FO0FBQ3BFLE1BQU0scUJBQXFCLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQTtBQUV6Qyx1RUFBdUU7QUFDaEUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFhLEVBQXNCLEVBQUU7SUFDaEUsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNwQyxJQUFJLENBQUMsT0FBTztRQUFFLE9BQU8sU0FBUyxDQUFBO0lBQzlCLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBc0IsQ0FBQTtRQUNuRyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3pELENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxPQUFPLFNBQVMsQ0FBQTtJQUNsQixD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