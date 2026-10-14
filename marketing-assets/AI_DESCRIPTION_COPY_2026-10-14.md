# GetGuac AI descriptions — October 14, 2026

Scope: Google Play main and promotional product pages, Apple App Store main and custom product pages, website product descriptions, and advertising copy. Subscription changes are deferred. These are prepared copy variants, not a record of publication.

## Owner-approved provider wording

Chat and AI engine powered by Gemini, Grok, and OpenAI/ChatGPT.

Ask questions about your spending, receipts, budgeting, and GetGuac features. Get understandable explanations and next steps.

Publication dependency: the inspected chat route currently uses Gemini 2.5 Flash with Groq-hosted Llama 3.3 70B as fallback. No xAI Grok or OpenAI integration was found. Groq is distinct from Grok. The owner-approved provider wording must not be published as existing functionality until those integrations are implemented and verified. No “Coming soon” label is included in the requested copy.

## Google Play

Short description (under 80 characters):

Receipts, spending insights, savings plans and AI chat for your money questions.

Full-description section, with requested provider wording once verified:

CHAT AND AI ENGINE

Chat and AI engine powered by Gemini, Grok, and OpenAI/ChatGPT. Ask questions about your recorded spending, understand receipts and categories, explore budgeting concepts, and get help using GetGuac. AI supports explanations and receipt processing; financial calculations use your recorded data and deterministic rules. Answers are educational and do not include stock picks or guaranteed savings.

Promotional product-page description:

Organize receipts, understand spending, and review savings choices in one place. Ask questions with GetGuac's chat and AI engine, powered by Gemini, Grok, and OpenAI/ChatGPT. Compare relevant options and save your choices.

## Apple App Store

Promotional text (under 170 characters):

Organize receipts, understand spending, and ask money questions with an AI chat and engine powered by Gemini, Grok, and OpenAI/ChatGPT.

Description section: use the Google Play CHAT AND AI ENGINE section above.

Custom product-page text: use the promotional product-page description above, subject to the fields supported by App Store Connect.

## Website

Product-description sentence:

Chat and AI engine powered by Gemini, Grok, and OpenAI/ChatGPT—helping you understand receipts, explore your spending, and get answers to money and GetGuac questions.

Expanded feature explanation:

Ask about your recorded spending, understand categories, learn budgeting concepts, and find your next step in GetGuac. AI helps process receipts and explain information. Saved financial records and deterministic calculations remain the basis for amounts and progress.

## Advertising

Headline:

Ask Guac. Understand your money.

Description:

Receipts, spending insights and AI chat powered by Gemini, Grok, and OpenAI/ChatGPT.

Social caption:

Your receipts tell a story. GetGuac helps you understand it. Organize purchases, review spending and savings choices, and ask questions with a chat and AI engine powered by Gemini, Grok, and OpenAI/ChatGPT.

## Accurate provider sentence available with current implementation

Chat and AI engine powered by Google Gemini and Groq-hosted Llama models.

## Verification and remaining work

- Inspected web/src/app/api/chat/route.js and receipt-processing integrations.
- Located existing source copy in marketing-assets/STORE_LISTINGS.md; it contains older free/no-subscription claims and beta status, so it is not reliable evidence of current published descriptions.
- Located October 8 store promotional-page submission records.
- Verified signed-in Google Play, App Store Connect and Google Ads sessions later in this chat. Apple iOS 0.4.24 build264 is Ready for Distribution; its main description is locked for the released version. No copy edits were submitted.
- No live website, store listing, advertisement, pricing, subscription or campaign budget was changed.
- Remaining: implement and verify the additional providers; retrieve current live copy; apply consistent updates while preserving unrelated content; verify saved store fields, submitted status and live website desktop/mobile rendering. Store review and publication must be reported separately.

## Latest release direction

Owner deferred app deployment and requested the build be completed first. Website/store/ad publication stays on hold. Grok/OpenAI implementation and subscriptions were previously deferred; no unsupported provider claim is activated by the build.

News and notification descriptions prepared for the new build, to publish after release verification:

Read financial news and company stories without signing in. Sign in to save watchlists and personalize news. Choose daily or weekly news roundups, important updates only, or switch news alerts off. Optional push alerts use your enabled notification devices.

Earnings description requiring verified data access before publication:

Follow scheduled company earnings for major stocks and your saved watchlists. Compare available analyst EPS and revenue estimates with reported results, with source and update time. Estimates are not guaranteed results or investment recommendations.

Live earnings data is not yet verified because the provider credential is absent. Do not publish the earnings paragraph as working live coverage until the credential and data access are confirmed.
