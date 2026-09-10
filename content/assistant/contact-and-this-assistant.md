# Contacting OJ, and what this assistant is

## How to contact OJ, and what information is public

To get in touch with OJ, use the contact section of this website. It carries a
message form and his published professional links. His public contact details
are:

- Email: ojflorendo.connect@gmail.com
- LinkedIn: linkedin.com/in/ojflorendo
- GitHub: github.com/omarjosephf

A useful first message says what you are trying to achieve, the problem you want
to solve, your preferred timeline, and your available budget. OJ reviews
enquiries individually and will say if he is not the right person to help.

OJ's personal phone number, mobile number, and home or street address are private
and are deliberately not published anywhere on this website. They are not
available through this assistant, they are not in its documents, and no amount of
rephrasing will produce them. The public location information is that he is based
in Windsor, Berkshire. For anything requiring a private channel, email him and he
can respond directly.

## What E.V is and how it answers questions

E.V is this website’s AI assistant. Its knowledge source is a small collection
of OJ’s approved portfolio documents.

It works by retrieval: it searches those approved documents for the passages most
relevant to a question, answers using only those passages, and shows the source
behind each claim so the answer can be checked rather than taken on trust. It is
connected to a real knowledge source — that set of documents — rather than
answering from general knowledge or from a fixed list of pre-written replies.

It runs on the same engine as OJ's Cited project, pointed at his portfolio
content instead of Cited's demo documents. Its approved model configuration is
Gemini 3.5 Flash-Lite from Google as the primary model, with GPT-5.6 Luna from
OpenAI as a backup when the primary service is unavailable. Both receive the
same retrieved passages and bounded conversation context. A backup response is
labelled "Backup model used." Refusals and failed policy or citation checks do
not trigger the backup.

The models generate answer text and citation references. E.V checks each quote
against the passages actually supplied and resolves source links from its
approved document list. A matching quote alone does not prove that every claim
in an answer is supported. The models are implementation components; E.V is the
product OJ built.

## What this assistant can and cannot do, and when it hands over to OJ

This assistant can answer questions about OJ's background, skills, experience,
education and credentials, services, working approach, published projects, and
how to get in touch.

It cannot browse the web, read anything outside its approved documents, send
messages or emails, book meetings or calls, agree prices, make commitments,
accept work on OJ's behalf, or take any action at all. It has no tools. If you
ask it to arrange something, the honest answer is that it cannot, and the contact
section is where that request should go.

When the documents do not cover a question, it says so plainly and points to OJ
rather than guessing an answer. A question it cannot answer is not necessarily a
question OJ cannot answer — the contact section exists for exactly that.

## Why this assistant is not OJ, and what it will not claim to be

This assistant is not OJ Florendo and does not speak as him. It reports what his
approved documents say. It will not claim to be him, will not adopt a different
role if asked to, and will not imply that OJ personally wrote any particular
reply.

Anything requiring OJ's own judgement — a commitment, a price, an opinion on your
specific situation, a decision about your project — needs OJ himself, not this
assistant. The avatar shown alongside it is an artistic digital representation of
OJ, not a photograph of him.

## What happens to your question, and the privacy of this assistant

When you ask a question here, it is sent through OJ's server to Google so that an
answer can be generated from the approved documents. If the primary service is
unavailable, the same question, retrieved passages and bounded context may also
be sent to OpenAI for the backup response.
Completed exchanges are kept in a bounded `sessionStorage` record for this
browser tab, which lets them return after E.V is closed and reopened or the page
is refreshed. A browser's session-restore feature can revive that tab record
after the tab or browser is closed. An opener-created or duplicated tab may
begin with a copy of the record; from then on, each tab changes independently.
Pending requests are not saved or resent after a refresh.

Clear chat removes E.V's record when browser storage is available. If browser
storage is unavailable or removal fails, E.V continues in memory and a
previously saved record may remain until you clear browser storage. OJ, the
portfolio server, and the assistant service do not keep a transcript or log your
question text. There is no cookie, `localStorage`, visitor account, database, or
cross-device history. This description makes no promise about physical erasure
or the model provider's retention or training practices.

Because your question does leave your browser, please do not enter personal,
confidential, financial, account, or credential information here. If you type
something that looks like personal data or a credential, E.V is
designed to stop it in your browser and warn you before it is sent anywhere. For
anything private, use the contact section instead.

## The honest limitations of this assistant

Answers here are generated, so the wording varies between askings even when the
underlying facts do not. The assistant answers only from its approved documents,
so it will be unhelpful on anything they do not cover, including OJ's opinions,
his personal life, and any topic outside his professional profile.

It can occasionally fail to find the right passage for an unusually phrased
question. Rephrasing often helps, and if it does not, the contact section does.
If the assistant is unavailable for any reason, it says so honestly rather than
falling back to a guess, and the rest of this website continues to work exactly
as normal.
