/** @vitest-environment node */
import { describe,expect,it } from "vitest";
import { answerReceipts } from "./answer-receipt";
const U="10000000-0000-4000-8000-000000000001",C="20000000-0000-4000-8000-000000000001",R="30000000-0000-4000-8000-000000000001";
const value={userId:U,conversationId:C,requestId:R,inputSha256:"b".repeat(64),result:{state:"unavailable" as const}};
describe("signed save-only answer receipts",()=>{
  it("binds the exact result, conversation, request and user",()=>{
    const receipts=answerReceipts("a".repeat(64),()=>1000),token=receipts.sign(value);
    expect(receipts.verify(token,U)).toEqual({...value,expiresAt:1801000});
    expect(()=>receipts.verify(token,C)).toThrow();
    const bytes=Buffer.from(token.slice(3),"base64url");bytes[28]^=1;
    expect(()=>receipts.verify(`v2.${bytes.toString("base64url")}`,U)).toThrow();
    expect(Buffer.from(token.slice(3),"base64url").toString()).not.toContain(U);
  });
  it("rejects expired, malformed and oversized receipts",()=>{
    let now=1000;const receipts=answerReceipts("a".repeat(64),()=>now),token=receipts.sign(value);now+=1800000;
    expect(()=>receipts.verify(token,U)).toThrow();expect(()=>receipts.verify("x".repeat(48001),U)).toThrow();expect(()=>receipts.verify("broken",U)).toThrow();
  });
  it("fails closed when the signing key is missing or rotated",()=>{
    expect(()=>answerReceipts("")).toThrow();const token=answerReceipts("a".repeat(64)).sign(value);expect(()=>answerReceipts("b".repeat(64)).verify(token,U)).toThrow();
  });
});
