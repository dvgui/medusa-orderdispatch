"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderReference = exports.buildOrderDispatchOrder = exports.indexProcessedOrders = exports.courierFor = exports.OrderDispatchError = exports.OrderDispatchClient = exports.ORDERDISPATCH_PROVIDER_ID = exports.ORDERDISPATCH_IDENTIFIER = exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = exports.ORDERDISPATCH_DEFAULT_BASE_URL = void 0;
var constants_1 = require("./constants");
Object.defineProperty(exports, "ORDERDISPATCH_DEFAULT_BASE_URL", { enumerable: true, get: function () { return constants_1.ORDERDISPATCH_DEFAULT_BASE_URL; } });
Object.defineProperty(exports, "ORDERDISPATCH_FULFILLMENT_OPTIONS", { enumerable: true, get: function () { return constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS; } });
Object.defineProperty(exports, "ORDERDISPATCH_IDENTIFIER", { enumerable: true, get: function () { return constants_1.ORDERDISPATCH_IDENTIFIER; } });
Object.defineProperty(exports, "ORDERDISPATCH_PROVIDER_ID", { enumerable: true, get: function () { return constants_1.ORDERDISPATCH_PROVIDER_ID; } });
var orderdispatch_client_1 = require("./lib/orderdispatch-client");
Object.defineProperty(exports, "OrderDispatchClient", { enumerable: true, get: function () { return orderdispatch_client_1.OrderDispatchClient; } });
Object.defineProperty(exports, "OrderDispatchError", { enumerable: true, get: function () { return orderdispatch_client_1.OrderDispatchError; } });
var tracking_1 = require("./lib/tracking");
Object.defineProperty(exports, "courierFor", { enumerable: true, get: function () { return tracking_1.courierFor; } });
Object.defineProperty(exports, "indexProcessedOrders", { enumerable: true, get: function () { return tracking_1.indexProcessedOrders; } });
var build_order_1 = require("./lib/build-order");
Object.defineProperty(exports, "buildOrderDispatchOrder", { enumerable: true, get: function () { return build_order_1.buildOrderDispatchOrder; } });
Object.defineProperty(exports, "orderReference", { enumerable: true, get: function () { return build_order_1.orderReference; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseUNBT29CO0FBTmxCLDJIQUFBLDhCQUE4QixPQUFBO0FBQzlCLDhIQUFBLGlDQUFpQyxPQUFBO0FBQ2pDLHFIQUFBLHdCQUF3QixPQUFBO0FBQ3hCLHNIQUFBLHlCQUF5QixPQUFBO0FBSTNCLG1FQUFvRjtBQUEzRSwySEFBQSxtQkFBbUIsT0FBQTtBQUFFLDBIQUFBLGtCQUFrQixPQUFBO0FBRWhELDJDQUFtRjtBQUExRSxzR0FBQSxVQUFVLE9BQUE7QUFBRSxnSEFBQSxvQkFBb0IsT0FBQTtBQUN6QyxpREFBMkU7QUFBbEUsc0hBQUEsdUJBQXVCLE9BQUE7QUFBRSw2R0FBQSxjQUFjLE9BQUEifQ==