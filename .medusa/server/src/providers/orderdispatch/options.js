"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrderDispatchOptions = void 0;
const utils_1 = require("@medusajs/framework/utils");
const resolveOrderDispatchOptions = (options) => {
    const username = options?.username?.trim();
    const password = options?.password;
    if (!username || !password) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "OrderDispatch requires username and password (ORDERDISPATCH_USERNAME / ORDERDISPATCH_PASSWORD)");
    }
    return {
        ...options,
        username,
        password,
        source: options?.source?.trim() || "MEDUSA",
        checkSkus: options?.checkSkus ?? true,
        skuCacheMs: options?.skuCacheMs ?? 5 * 60_000,
    };
};
exports.resolveOrderDispatchOptions = resolveOrderDispatchOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9vcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUF1RDtBQW1CaEQsTUFBTSwyQkFBMkIsR0FBRyxDQUN6QyxPQUEwRCxFQUM1QixFQUFFO0lBQ2hDLE1BQU0sUUFBUSxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDMUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxFQUFFLFFBQVEsQ0FBQTtJQUNsQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0IsTUFBTSxJQUFJLG1CQUFXLENBQ25CLG1CQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFDOUIsZ0dBQWdHLENBQ2pHLENBQUE7SUFDSCxDQUFDO0lBQ0QsT0FBTztRQUNMLEdBQUcsT0FBTztRQUNWLFFBQVE7UUFDUixRQUFRO1FBQ1IsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksUUFBUTtRQUMzQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxJQUFJO1FBQ3JDLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxJQUFJLENBQUMsR0FBRyxNQUFNO0tBQzlDLENBQUE7QUFDSCxDQUFDLENBQUE7QUFuQlksUUFBQSwyQkFBMkIsK0JBbUJ2QyJ9