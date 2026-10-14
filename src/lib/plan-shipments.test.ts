import { describe, expect, it } from "bun:test"

import { planShipments } from "./plan-shipments"
import { courierFor, indexProcessedOrders } from "./tracking"

const processed = indexProcessedOrders([
  {
    NumOrderId: 1,
    ReferenceNum: "1201",
    ProcessedDateTime: "2026-10-15T10:00:00",
    ServiceName: "OBA Royal Mail Tracked 48",
    TrackingNumber: "TT123456789GB",
  },
  { NumOrderId: 2, ReferenceNum: "1202", ProcessedDateTime: "2026-10-15T11:00:00", ServiceName: "DPD Next Day UK", TrackingNumber: "" },
  // A re-processed order: the later record wins.
  { NumOrderId: 3, ReferenceNum: "1201", ProcessedDateTime: "2026-10-14T10:00:00", ServiceName: "Old", TrackingNumber: "OLD" },
])

describe("planShipments", () => {
  it("plans the dispatched fulfillments and leaves the rest for the next run", () => {
    const planned = planShipments(
      [
        { id: "ful_1", data: { odReference: "1201", odOrderNumber: "9001" }, order: { id: "order_1" }, items: [{ line_item_id: "li_1", quantity: 2 }] },
        { id: "ful_2", data: { odReference: "1299" }, order: { id: "order_2" } },
        { id: "ful_3", data: {}, order: { id: "order_3" } },
        { id: "ful_4", data: { odReference: "1202" }, order: null },
      ],
      processed
    )
    expect(planned).toHaveLength(1)
    const [{ reference, input }] = planned
    expect(reference).toBe("1201")
    expect(input).toMatchObject({
      order_id: "order_1",
      fulfillment_id: "ful_1",
      items: [{ id: "li_1", quantity: 2 }],
      tracking_number: "TT123456789GB",
      tracking_url: "https://www.royalmail.com/track-your-item#/tracking-results/TT123456789GB",
    })
    // Existing data is kept: updateFulfillment replaces `data` as a whole.
    expect(input.data).toMatchObject({ odOrderNumber: "9001", odCourier: "Royal Mail", odTrackingNumber: "TT123456789GB" })
  })

  it("marks a dispatched order shipped even without a tracking number", () => {
    const [planned] = planShipments([{ id: "ful_2", data: { odReference: "1202" }, order: { id: "order_2" } }], processed)
    expect(planned.input.tracking_number).toBe("")
    expect(planned.input.data.odCourier).toBe("DPD")
  })
})

describe("courierFor", () => {
  it("names the courier and links its tracking page", () => {
    expect(courierFor("ParcelForce Express 24", "PF1")).toEqual({
      courier: "Parcelforce",
      trackingUrl: "https://www.parcelforce.com/track-trace?trackNumber=PF1",
    })
    expect(courierFor("Hermes UK Standard", "H1").courier).toBe("Evri")
    expect(courierFor("Spring Packet Tracked", "S1")).toEqual({
      courier: "Spring Packet Tracked",
      trackingUrl: "https://www.orderdispatch.co.uk/tracking/?trackingNumber=S1",
    })
    expect(courierFor(null, null)).toEqual({ courier: "OrderDispatch", trackingUrl: null })
  })
})
