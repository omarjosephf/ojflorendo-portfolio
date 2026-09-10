import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { parseAssistantResult } from "@/lib/assistant/client-state";
import { parseAnswerEvent, eventMatchesResult, type AnswerEvent } from "@/lib/assistant/answer-event";
import type { AssistantResult } from "@/lib/assistant/types";
import { ConversationStorageError, isConversationId } from "./conversation-repository";
export type AnswerReceipt = { userId:string; conversationId:string; requestId:string; inputSha256:string; result:AssistantResult; event?:AnswerEvent; expiresAt:number };
/** Authenticated encryption keeps owner diagnostics out of visitor-readable receipts. */
export function answerReceipts(secret:string,now:()=>number=Date.now){
  if(typeof window!=="undefined"||!/^[a-f0-9]{64}$/.test(secret)) throw new ConversationStorageError("unavailable");
  const key=Buffer.from(secret,"hex"), aad=Buffer.from("ev-answer-receipt-v2");
  return {
    sign(value:Omit<AnswerReceipt,"expiresAt">){
      const body=Buffer.from(JSON.stringify({...value,expiresAt:now()+30*60000}));
      if(body.length>35000) throw new ConversationStorageError("invalid");
      const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(aad);
      const encrypted=Buffer.concat([cipher.update(body),cipher.final()]);
      return `v2.${Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url")}`;
    },
    verify(token:unknown,userId:string):AnswerReceipt{
      if(typeof token!=="string"||token.length>48000) throw new ConversationStorageError("invalid");
      let value:AnswerReceipt;
      try{
        if (!token.startsWith("v2.")) {
          // Preserve pending pre-upgrade save receipts for their existing expiry.
          if(!/^[-_a-zA-Z0-9]+\.[-_a-zA-Z0-9]{43}$/.test(token))throw new Error("Invalid receipt");
          const [body,signature]=token.split(".");
          const expected=createHmac("sha256",key).update("ev-answer-receipt-v1\0").update(body).digest();
          const actual=Buffer.from(signature,"base64url");
          if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error("Invalid receipt");
          value=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as AnswerReceipt;
          if(value.event!==undefined)throw new Error("Legacy receipt cannot carry diagnostics");
        } else {
        if(!/^v2\.[-_a-zA-Z0-9]+$/.test(token))throw new Error("Invalid receipt");
        const bytes=Buffer.from(token.slice(3),"base64url");
        if(bytes.length<29||bytes.toString("base64url")!==token.slice(3))throw new Error("Invalid receipt");
        const decipher=createDecipheriv("aes-256-gcm",key,bytes.subarray(0,12));
        decipher.setAAD(aad);decipher.setAuthTag(bytes.subarray(12,28));
        value=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString("utf8")) as AnswerReceipt;
        }
      }catch{throw new ConversationStorageError("invalid");}
      const result=parseAssistantResult(value?.result);
      if(!value||value.userId!==userId||![value.userId,value.conversationId,value.requestId].every(isConversationId)||!/^[a-f0-9]{64}$/.test(value.inputSha256)||!Number.isSafeInteger(value.expiresAt)||value.expiresAt<=now()||value.expiresAt>now()+30*60000||!result||result.state==="blocked"||
        (value.event!==undefined&&(!parseAnswerEvent(value.event)||!eventMatchesResult(value.event,result)))) throw new ConversationStorageError("invalid");
      return {...value,result};
    },
  };
}
