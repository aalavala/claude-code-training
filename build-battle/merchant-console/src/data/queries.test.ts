import { describe, expect, it } from "vitest"
import { Payment } from "./types"
import { sortPayments } from "./queries"

/**
 * Amount is a number, not a padded string like createdAt — sorting it with
 * localeCompare was a lexicographic bug hiding behind dates that happened to
 * sort correctly the same way. This pins numeric order specifically.
 */

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: "pay_0000",
    merchantId: "mch_01",
    amount: 0,
    currency: "USD",
    status: "captured",
    method: "card",
    cardBrand: "visa",
    last4: "4242",
    createdAt: "2026-03-14T10:15:00.000Z",
    description: "Order",
    ...overrides,
  }
}

describe("sortPayments", () => {
  it("orders amounts numerically, not lexicographically", () => {
    // Lexicographic comparison would rank 994 above 9873, since "994" >
    // "9873" character-by-character (position 1: '9' vs '8'). Numeric order
    // puts the larger amount first.
    const small = payment({ id: "pay_small", amount: 994 })
    const large = payment({ id: "pay_large", amount: 9873 })

    const desc = sortPayments([small, large], "amount", "desc")
    expect(desc.map((p) => p.id)).toEqual(["pay_large", "pay_small"])

    const asc = sortPayments([small, large], "amount", "asc")
    expect(asc.map((p) => p.id)).toEqual(["pay_small", "pay_large"])
  })
})
