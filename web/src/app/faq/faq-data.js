// FAQ content, split out of page.jsx so the server component can build the
// FAQPage JSON-LD from it while the client component renders search + accordion
// from the same source. Nothing here imports React or lucide: GROUP_META names
// its icon as a STRING and FaqClient maps that to a component, so this module
// stays usable from the server render.

export const FAQ_GROUPS = {
  "Receipts & purchase data": [
    {
      "q": "Why Do I Need GetGuac If My Bank Already Shows My Purchases?",
      "body": "This is probably the most important question.\n\nYour bank may show:\n\n**TARGET — $184.52**\n\nBut that doesn't necessarily tell you everything inside the purchase.\n\nA receipt can contain:\n\n* individual items\n* quantities\n* item prices\n* taxes\n* discounts\n* payment information\n* purchase date\n* store information\n* other purchase details\n\nGetGuac turns that receipt information into structured data you can search, organize, analyze and ask questions about.\n\n### Your bank answers:\n\n**“Where did my money go?”**\n\n### GetGuac can help answer:\n\n**“What did I actually buy?”**\n\nThat difference is the foundation of GetGuac."
    },
    {
      "q": "Why Should I Scan a Receipt If I Already Check It at the Store?",
      "body": "Checking your receipt at checkout is useful.\n\nIt can help you catch an immediate mistake.\n\nBut your relationship with the receipt doesn't have to end when you leave the store.\n\nAfter the purchase, you may still need the receipt to:\n\n* return something\n* find proof of purchase\n* remember what you bought\n* review household spending\n* organize business purchases\n* understand previous purchases\n* answer questions about your spending\n\nGetGuac turns the receipt from a piece of paper into searchable purchase information.\n\n### In simple terms:\n\n**At checkout:**\n“Did I get charged correctly?”\n\n**Later:**\n“What did I buy, where is my receipt, can I still return it, and what does this purchase tell me about my spending?”"
    },
    {
      "q": "Why Would I Track Grocery Receipts?",
      "body": "You don't necessarily need to track every grocery receipt.\n\nIf you only care about your total monthly spending, your bank or credit card may already be enough.\n\nGetGuac becomes more useful when you want to understand the **details behind the total**.\n\nFor example:\n\nYour bank might show:\n\n**Whole Foods — $142.63**\n\nA receipt can show:\n\n* groceries\n* snacks\n* household products\n* personal-care items\n* quantities\n* individual prices\n\nOver multiple purchases, that information can help you understand where your grocery money is actually going.\n\n### Instead of asking:\n\n**“Why did groceries cost $700 this month?”**\n\nYou can ask:\n\n**“What did I actually spend money on?”**\n\nAnd with Guac-AI:\n\n**“What did groceries cost me this month?”**"
    },
    {
      "q": "Does GetGuac Replace My Bank?",
      "body": "No.\n\nGetGuac is not a bank.\n\nYour bank remains the source of truth for your actual account balance and financial transactions.\n\nGetGuac is designed to provide another layer of information around your purchases and financial documents.\n\nThink of it this way:\n\n**Bank = transaction**\n\n**Receipt = purchase details**\n\n**GetGuac = intelligence built from those details**"
    },
    {
      "q": "How Do I Add a Receipt?",
      "body": "GetGuac currently supports multiple ways to capture purchase information.\n\nYou can:\n\n### 📷 Take a photo\n\nSnap a picture of a paper receipt.\n\n### 📄 Upload a document\n\nDrop a supported PDF or document.\n\n### 📧 Forward an e-receipt\n\nForward an online receipt to your GetGuac receipt-processing address.\n\nThe current website describes the process as:\n\n**Drop or snap → Auto-organized → Rate & learn.**"
    },
    {
      "q": "Can GetGuac Handle Online Receipts?",
      "body": "Yes.\n\nGetGuac provides a free **@getguac.app** mailbox.\n\nYou can use it for merchant accounts, loyalty programs, subscriptions and online shopping.\n\nYou can also forward existing e-receipts to the receipt-processing address."
    },
    {
      "q": "Can I Automatically Forward Receipts?",
      "body": "Yes.\n\nThe current GetGuac email system supports forwarding rules from services such as Gmail or Outlook.\n\nFor example, you could create a rule that forwards order confirmations to your GetGuac receipt-processing address.\n\nThis means you don't necessarily have to photograph every receipt manually."
    },
    {
      "q": "Can Guac-AI Understand My Receipts?",
      "body": "Yes.\n\nGuac-AI processes receipt information and extracts structured information from supported receipts.\n\nThe current email documentation describes extraction of:\n\n* store\n* items\n* total\n* taxes\n* payment method\n\nand says processed receipts appear in your Receipts feed."
    },
    {
      "q": "Is GetGuac a Bank?",
      "body": "No.\n\nGetGuac is a financial/purchase-management tool.\n\nIt is not a bank."
    },
    {
      "q": "Why Not Just Use My Bank?",
      "body": "If you only need:\n\n* account balances\n* transaction totals\n* basic spending totals\n\nyour bank may be enough.\n\nGetGuac becomes useful when you want information from your **receipts and purchase details** in addition to transaction information.\n\nThat's the difference."
    },
    {
      "q": "Do I Have to Scan Every Receipt?",
      "body": "No.\n\nYou can use different capture methods, including email-based receipt processing.\n\nGetGuac's goal is to reduce the work required to maintain your purchase history.\n\nYou can also start with the receipts that matter most to you.\n\nFor example:\n\n* expensive purchases\n* family shopping\n* business purchases\n* returns\n* warranties\n* recurring purchases"
    },
    {
      "q": "What If I Only Want a Simple Receipt Organizer?",
      "body": "That's completely fine.\n\nYou can use GetGuac simply as a digital receipt system.\n\nThe additional AI and financial features are there when you want more."
    },
    {
      "q": "Can GetGuac Work With Different Stores?",
      "body": "GetGuac is designed to process receipts from many merchants.\n\nIts email system specifically gives examples including:\n\n* Amazon\n* Walmart\n* Target\n* Best Buy\n* restaurants\n\nand other merchants.\n\nReceipt formats vary by retailer, so extraction quality can vary."
    },
    {
      "q": "Can GetGuac Connect to Retailers?",
      "body": "GetGuac has a retailer-connections feature in beta for selected retailers.\n\nThe current Terms state that some retailer connections allow users to sign into the retailer inside the mobile app so GetGuac can access their order data.\n\nThe credentials are not stored by GetGuac according to the current Terms, but retailer terms may restrict automated access and the feature may change if a retailer changes its website."
    },
    {
      "q": "Can I Use GetGuac for Business Receipts?",
      "body": "Yes, you can organize your own business-related receipts.\n\nThe product currently includes business mileage and tax-oriented reporting features.\n\nAlways confirm tax treatment and documentation requirements with your accountant or tax professional."
    }
  ],
  "Getting started": [
    {
      "q": "Isn't My Credit Card Statement Enough?",
      "body": "For high-level spending, it may be.\n\nA credit-card statement is excellent for answering:\n\n**How much did I spend?**\n\nBut a receipt can answer a different question:\n\n**What did I buy?**\n\nFor example:\n\n### Credit card\n\n**Walmart — $216.48**\n\n### Receipt\n\n* groceries\n* cleaning products\n* clothing\n* electronics\n* personal care\n\nGetGuac is designed to add that purchase-level information to your financial picture."
    },
    {
      "q": "Do I Need a Credit Card to Sign Up?",
      "body": "No.\n\nThe current GetGuac website says:\n\n**“Free. No card. No catch.”**\n\nand describes the service as free with no credit card required."
    },
    {
      "q": "Is GetGuac Free?",
      "body": "Yes.\n\nGetGuac is currently free.\n\nThe Terms of Service also state that if paid features are introduced in the future, users will see the price and what they receive before being charged."
    },
    {
      "q": "Do I Need to Download an App?",
      "body": "No.\n\nGetGuac works on the web.\n\nThe current product also has Android availability, while the iPhone experience can be installed as a web app from Safari.\n\nNative iOS availability is listed as coming through TestFlight."
    },
    {
      "q": "Is GetGuac Available on Android?",
      "body": "Yes.\n\nThe current download page lists a native Android application."
    },
    {
      "q": "Is GetGuac Available on iPhone?",
      "body": "The current product can be installed as a web app through Safari.\n\nThe download page states that a native iOS app is coming through TestFlight."
    },
    {
      "q": "Can I Use GetGuac on a Computer?",
      "body": "Yes.\n\nThe current website states:\n\n**“Use GetGuac in your browser — everything works.”**"
    },
    {
      "q": "Is GetGuac Useful for Freelancers?",
      "body": "It can be.\n\nFreelancers and independent workers often need to keep purchase records organized.\n\nGetGuac provides receipt organization, business mileage functionality and data export features.\n\nHowever, GetGuac should not be treated as a substitute for professional tax advice."
    },
    {
      "q": "How Do I Get Started?",
      "body": "It's simple.\n\n### 1. Create your free account.\n\n### 2. Add a receipt.\n\nSnap a receipt, upload supported information, or forward an e-receipt.\n\n### 3. Let Guac-AI organize it.\n\nThe system extracts available purchase information.\n\n### 4. Explore your insights.\n\nLook at your receipts, spending information, alerts and other available features.\n\n### 5. Ask Guac.\n\nAsk questions about the purchase information available in your account."
    }
  ],
  "Privacy & account": [
    {
      "q": "Do I Have to Give GetGuac My Bank Login?",
      "body": "No.\n\nGetGuac's website specifically says:\n\n**“We never ask for your bank login.”**\n\nThat is one of the major differences in the GetGuac approach.\n\nYou can use receipts and supported documents without making bank-account credentials the foundation of the product."
    },
    {
      "q": "What Is the GetGuac Email Address?",
      "body": "Each account receives a GetGuac mailbox.\n\nThere are two relevant addresses:\n\n### Your personal mailbox\n\n**[you@getguac.app](mailto:you@getguac.app)**\n\nThis can be used like a personal GetGuac mailbox.\n\n### Receipt-processing address\n\n**[you+g@getguac.app](mailto:you+g@getguac.app)**\n\nMail sent to the +g address is processed by Guac-AI for receipt extraction.\n\nThe current documentation says the AI extracts information such as store, line items, total, taxes and payment method."
    },
    {
      "q": "Can I Export My Data?",
      "body": "Yes.\n\nThe Terms state that users can export their own data from their profile.\n\nThe product also demonstrates CSV export functionality for financial information."
    },
    {
      "q": "Is My Data Private?",
      "body": "GetGuac says:\n\n**“We never sell your data.”**\n\nThe current website also describes encryption in transit and at rest, row-level security, and the ability to delete your data.\n\nThe email system is opt-in, and the receipt-processing address is specifically used for automatic receipt parsing."
    },
    {
      "q": "Can I Delete My Data?",
      "body": "Yes.\n\nGetGuac's Terms state that users can delete their account and data from their profile and that the service is designed to perform a hard delete within 24 hours.\n\nThe email documentation also describes one-click deletion of the mailbox, messages, parsed receipts and alias."
    },
    {
      "q": "Can GetGuac Employees See My Receipts?",
      "body": "The current website states that row-level security is designed so that even GetGuac engineers cannot see your data.\n\nFor complete details, users should review the current Security and Privacy documentation."
    },
    {
      "q": "Why Not Just Keep My Receipts in My Email?",
      "body": "You can.\n\nBut email is designed for communication.\n\nGetGuac is designed to turn receipt information into structured purchase data.\n\nInstead of searching:\n\n> “Amazon receipt June”\n\nyou can potentially ask:\n\n> “What did I buy from Amazon in June?”\n\nThat's the long-term value of turning receipts into structured information."
    },
    {
      "q": "Why Does Receipt Data Matter?",
      "body": "Because receipts contain information that isn't always visible in a bank transaction.\n\nA transaction may say:\n\n**Costco — $241.52**\n\nThe receipt can contain dozens of individual purchases.\n\nOnce those purchases are structured, you can potentially:\n\n* categorize them\n* search them\n* compare them\n* analyze them\n* ask questions about them\n* track them over time\n\nThat is what makes receipt data valuable."
    },
    {
      "q": "Does GetGuac Sell My Data?",
      "body": "GetGuac states:\n\n**“We never sell your data.”**\n\nFor the complete details of data collection, storage and processing, review the current Privacy Policy."
    },
    {
      "q": "What Happens If I Leave GetGuac?",
      "body": "You can delete your account and data.\n\nThe current Terms state that account deletion can be initiated from your profile and that GetGuac intends to hard-delete the account data within 24 hours."
    },
    {
      "q": "Can I Use GetGuac Instead of My Personal Email for Shopping?",
      "body": "Yes.\n\nOne interesting feature of GetGuac is its free @getguac.app mailbox.\n\nYou can use it for:\n\n* online shopping\n* merchant accounts\n* loyalty programs\n* subscriptions\n* retailer communications\n\nThis can help keep shopping-related email separate from your primary inbox."
    },
    {
      "q": "Can GetGuac Help With Surveillance Pricing?",
      "body": "Surveillance pricing is when a retailer sets **your** price from **your** data — location, device, browsing history, past purchases, and an inferred guess at what you are willing to pay.\n\nThe FTC confirmed in January 2025 that a wide range of personal data is used to set individualised prices, and several US states, Manitoba and the UK have since moved to regulate it.\n\nThe practical problem for a shopper is simple:\n\n> A price on a screen cannot tell you whether it is the price, or your price.\n\n### What GetGuac can actually do\n\n* **Keep your own price log.** Receipts record what you paid, by item, by store, by date. A price that quietly moved is visible against your own history rather than against a number the seller chose to show you.\n* **Compare the item, not the offer.** Steals watches things you rebuy across retailers, so the benchmark comes from the market.\n* **Give shopping its own identity.** The free @getguac.app mailbox keeps merchant accounts, loyalty programmes and order confirmations away from the personal address that follows you everywhere.\n* **Never require a bank login.** GetGuac does not ask for bank credentials, and states that it never sells your data.\n\n### What it cannot do\n\nGetGuac cannot stop a retailer from personalising your price, and it does not claim to.\n\nWhat it can do is keep the evidence — your own itemised purchase history — so a price change is something you can notice, question, and act on."
    },
    {
      "q": "What Happens to My Email?",
      "body": "Inbox processing is opt-in.\n\nThe current documentation says you can turn inbox syncing off in your email settings.\n\nOnly messages sent to the +g receipt-processing address are automatically filed as receipts."
    }
  ],
  "Features & Guac-AI": [
    {
      "q": "What Does Guac-AI Actually Do?",
      "body": "Guac-AI is designed to turn your receipts and supported financial information into useful insights.\n\nThe current GetGuac site describes Guac-AI as being able to:\n\n* organize purchases\n* tag information\n* identify patterns\n* surface subscriptions\n* identify fees\n* help analyze spending\n* answer questions about receipts and spending\n* provide recommendations or nudges\n\nThe goal isn't simply to store receipts.\n\n### The goal is to make your purchase data useful."
    },
    {
      "q": "Can I Ask Guac-AI Questions About My Spending?",
      "body": "Yes.\n\nThe current website demonstrates questions such as:\n\n> “What did groceries cost me?”\n\nGuac-AI can use your available purchase information to answer questions about your receipts and spending.\n\nPotential questions include:\n\n### “What did I spend on groceries?”\n\n### “What did I buy at Costco?”\n\n### “How much did I spend this month?”\n\n### “What changed in my spending?”\n\n### “Which subscriptions did you find?”\n\nThe exact answer depends on the information available in your account."
    },
    {
      "q": "What Is GuacScore?",
      "body": "GuacScore is GetGuac's spending score.\n\nThe current website describes it as a **0–100 grade for every dollar you spent**, incorporating factors such as purchase amount, ratings and fees.\n\nThe purpose is to give you a simple way to look at your spending behavior instead of reviewing hundreds of individual transactions."
    },
    {
      "q": "Can GetGuac Find Hidden Fees?",
      "body": "GetGuac includes a **Bank Bite Tracker** designed to identify things such as:\n\n* interest charges\n* overdraft charges\n* annual fees\n* other potentially avoidable financial charges\n\nThe current website presents these as itemized financial insights.\n\nThe goal is simple:"
    },
    {
      "q": "Can GetGuac Find Forgotten Subscriptions?",
      "body": "GetGuac includes subscription analysis.\n\nThe current website demonstrates identifying recurring charges and examples such as subscriptions that may have increased in price or gone unused.\n\nThe purpose is to help you notice recurring expenses that deserve another look."
    },
    {
      "q": "Can GetGuac Track Return Windows?",
      "body": "GetGuac includes return/refund tracking.\n\nThe website demonstrates purchase information such as:\n\n**Return window — 5 days left to act**\n\nand shows open refund amounts.\n\nThis can be useful because the problem with returns isn't always knowing that you bought something.\n\nIt's remembering:\n\n**“When is my last day to return it?”**\n\nAlways verify the actual return policy with the merchant before relying on a deadline."
    },
    {
      "q": "Can GetGuac Get Me a Refund?",
      "body": "GetGuac can help surface potential refund or return opportunities based on the information available to it.\n\nIt does not guarantee that a merchant will issue a refund.\n\nThe merchant's actual policy controls."
    },
    {
      "q": "Can GetGuac Find Better Prices?",
      "body": "GetGuac includes a **Steals** feature designed to watch searches and identify potentially better prices on things you want or rebuy.\n\nThe current website demonstrates price-drop and deal examples.\n\nThis is important because GetGuac isn't only about looking backward at spending.\n\nIt can also help you make better future purchasing decisions."
    },
    {
      "q": "Does GetGuac Have Shopping Features?",
      "body": "Yes.\n\nThe current website includes:\n\n* Steals\n* Marketplace\n* Coupons\n* shopping lists\n* family shopping functionality\n\nThe Marketplace can surface shopping information and deals without requiring a login."
    },
    {
      "q": "What Is Smashlist?",
      "body": "Smashlist is the shared shopping-list functionality.\n\nThe current website demonstrates a shopping list that can:\n\n* contain multiple items\n* route items to stores\n* identify potentially cheaper stores\n* be shared with family\n\nThe purpose is to make household shopping more coordinated."
    },
    {
      "q": "Can GetGuac Predict When I'll Need to Buy Something Again?",
      "body": "GetGuac includes purchase-based prediction features.\n\nThe current website demonstrates predictions such as:\n\n**Milk — approximately 3 days**\n\n**Paper towels — approximately 5 days**\n\n**Dog food — approximately 1 week**\n\nThese are predictions based on purchase history and should be treated as estimates rather than guarantees."
    },
    {
      "q": "What Is Stash?",
      "body": "Stash is designed to help you keep track of items you've purchased.\n\nThe current website describes it as tracking unique items and purchase information.\n\nIt can become particularly useful for remembering:\n\n* electronics\n* household products\n* frequently purchased items\n* personal purchases"
    },
    {
      "q": "Can GetGuac Track Mileage?",
      "body": "Yes.\n\nThe current product includes mileage tracking.\n\nThe website demonstrates:\n\n* personal miles\n* business miles\n* charity miles\n* year-to-date mileage\n* tax-related mileage organization\n\nMileage and tax treatment should always be verified against applicable tax rules or with a qualified tax professional."
    },
    {
      "q": "Can GetGuac Help With Taxes?",
      "body": "GetGuac includes tax-oriented organization features.\n\nThe current website demonstrates:\n\n* business purchases\n* tax-deductible amounts\n* sales tax totals\n* CSV exports\n\nHowever:"
    }
  ],
  "Using GetGuac": [
    {
      "q": "Can My Family Use GetGuac?",
      "body": "Yes.\n\nGetGuac supports household functionality.\n\nThe Terms state that users can invite a small number of people who actually live with them into their household.\n\nThe product also includes a shared shopping-list feature.\n\nThis can be useful for families who want one place to organize purchases and shopping needs."
    },
    {
      "q": "What If I Don't Want to Track Every Purchase?",
      "body": "That's okay.\n\nGetGuac isn't designed to force you to manually document every dollar.\n\nStart with the information you care about.\n\nYou could use it primarily for:\n\n**receipts**\n\nor\n\n**returns**\n\nor\n\n**subscriptions**\n\nor\n\n**purchase history**\n\nor\n\n**shopping**\n\nor\n\n**financial insights**\n\nThe more information you provide, the more context Guac-AI can potentially use."
    },
    {
      "q": "Are GetGuac's Insights Always Correct?",
      "body": "No system should be treated as infallible.\n\nGetGuac's Terms specifically state that it cannot guarantee perfect receipt parsing or that predictions will always match actual behavior.\n\nFor anything involving:\n\n* exact financial amounts\n* taxes\n* legal obligations\n* merchant policies\n* return deadlines\n\nverify the information with the original source."
    },
    {
      "q": "Why Does GetGuac Sometimes Show Estimates?",
      "body": "Some insights are calculated from the information available to GetGuac.\n\nFor example, predictions about when you might need to buy something again are estimates based on previous behavior.\n\nThe more useful historical information available, the more context the system has.\n\nBut predictions should always be treated as predictions."
    },
    {
      "q": "Is GetGuac Useful for Families?",
      "body": "Yes.\n\nFamilies are one of the natural use cases because households generate a large number of purchases across multiple stores and people.\n\nGetGuac can help organize:\n\n* household purchases\n* receipts\n* shopping lists\n* recurring expenses\n* purchase history\n\nThe current product includes family sharing and shared shopping-list functionality."
    },
    {
      "q": "Does GetGuac Guarantee That I'll Save Money?",
      "body": "No.\n\nGetGuac can identify potential savings opportunities, but individual results vary.\n\nFor example, it may identify:\n\n* a subscription worth reviewing\n* a fee worth investigating\n* a return opportunity\n* a potential price difference\n* a spending pattern\n\nThe user ultimately decides what action to take."
    },
    {
      "q": "Still Have Questions?",
      "body": "If your question isn't answered here, contact the GetGuac team.\n\n**Email:** [hello@getguac.app](mailto:hello@getguac.app)\n\nThe current Terms list this as the support contact."
    }
  ],
  "Why GetGuac": [
    {
      "q": "Is GetGuac a Budgeting App?",
      "body": "It can help you understand spending, but its purpose is broader than traditional budgeting.\n\nTraditional budgeting often asks:\n\n**“How much can I spend?”**\n\nGetGuac also asks:\n\n**“What did I buy?”**\n\n**“What happened to my money?”**\n\n**“What can I return?”**\n\n**“What recurring charges should I review?”**\n\n**“What fees should I investigate?”**\n\n**“What can I learn from my purchases?”**"
    },
    {
      "q": "How Is GetGuac Different From YNAB?",
      "body": "YNAB is strongly focused on budgeting and assigning money to spending categories.\n\nGetGuac focuses heavily on receipts, purchases and purchase-level intelligence.\n\n### YNAB\n\n**Plan your money.**\n\n### GetGuac\n\n**Understand your purchases.**\n\nThey can serve different purposes."
    },
    {
      "q": "How Is GetGuac Different From Monarch?",
      "body": "Monarch focuses on bringing financial accounts together and giving users a broad view of their financial life.\n\nGetGuac adds a different layer:\n\n**purchase-level information from receipts and documents.**\n\n### Monarch\n\n**See your financial picture.**\n\n### GetGuac\n\n**Understand your purchases.**"
    },
    {
      "q": "How Is GetGuac Different From Fetch?",
      "body": "Fetch is fundamentally a rewards platform.\n\nUsers submit receipts to earn points and rewards.\n\nGetGuac uses receipt information primarily for organization, analysis and money-management insights.\n\n### Fetch\n\n**Submit receipts → earn rewards.**\n\n### GetGuac\n\n**Submit receipts → understand your money.**"
    },
    {
      "q": "How Is GetGuac Different From Ibotta?",
      "body": "Ibotta focuses heavily on cashback and shopping offers.\n\nGetGuac focuses on purchase intelligence and financial organization.\n\n### Ibotta\n\n**Save through cashback offers.**\n\n### GetGuac\n\n**Understand and protect money you've already spent.**"
    },
    {
      "q": "How Is GetGuac Different From Expensify?",
      "body": "Expensify is designed heavily around business expenses, expense reports and reimbursement workflows.\n\nGetGuac is designed as a broader consumer and household money assistant.\n\n### Expensify\n\n**Business expense management.**\n\n### GetGuac\n\n**Everyday purchase and money intelligence.**"
    },
    {
      "q": "What Is the Biggest Reason to Use GetGuac?",
      "body": "There isn't one answer for everyone.\n\n### For a family:\n\n**Keep purchases organized.**\n\n### For a frequent shopper:\n\n**Never lose track of purchases and returns.**\n\n### For a privacy-conscious user:\n\n**Get purchase intelligence without making bank login the foundation.**\n\n### For a freelancer:\n\n**Organize business-related purchases and receipts.**\n\n### For a budget-conscious household:\n\n**Understand where spending is actually going.**\n\n### For someone who hates paperwork:\n\n**Let AI organize receipts for you.**"
    },
    {
      "q": "What Does “Your Money's Wingman” Mean?",
      "body": "GetGuac isn't intended to replace your bank.\n\nIt isn't intended to replace your accountant.\n\nIt isn't intended to replace your financial advisor.\n\nIt is intended to be the assistant that sits alongside your financial life and helps you notice things you might otherwise overlook.\n\n### Your bank handles the money.\n\n### Your receipts document the purchases.\n\n### Guac-AI helps connect the information."
    },
    {
      "q": "Who Is GetGuac For?",
      "body": "GetGuac is especially useful for people who want more than a simple bank transaction list.\n\nIt may be a good fit if you:\n\n* shop frequently\n* manage a household\n* want organized receipts\n* make frequent returns\n* want purchase history\n* care about privacy\n* run a small business\n* work as a freelancer\n* want AI-powered spending insights\n* want to understand where your money goes"
    },
    {
      "q": "Who May Not Need GetGuac?",
      "body": "If you only want to know:\n\n**“How much money is in my bank account?”**\n\nyour bank already does that.\n\nIf you only want:\n\n**“How much did I spend this month?”**\n\nyour bank or budgeting app may already answer it.\n\nGetGuac is most useful when you want to go deeper:\n\n**What did I buy?**\n\n**Why did my spending change?**\n\n**What receipts do I have?**\n\n**What should I review?**\n\n**What purchases can I still return?**\n\n**What recurring charges should I investigate?**"
    },
    {
      "q": "What Makes GetGuac Different?",
      "body": "GetGuac isn't trying to be just another:\n\n**budget app**\n\nor\n\n**cashback app**\n\nor\n\n**receipt scanner**\n\nor\n\n**expense report system**\n\nIt combines receipt intelligence, financial document analysis, purchase organization, AI and money-saving tools.\n\nThe central idea is:"
    }
  ]
}

export const PRIORITY_FAQS = [
  {
    q: 'I already check my receipt at the store. Why should I scan it?',
    body: `### Picture this

You check the receipt at the register. The total is right, so you fold it into your bag and forget about it.

Eight days later, the headphones stop working. You know they can be returned—but the receipt is somewhere between the car, the kitchen counter, and the trash.

If you had scanned it, the store, item, price, purchase date, and proof of purchase would already be searchable in GetGuac.

**Checking protects the transaction today. Scanning protects the purchase tomorrow.**

You do not need to scan everything. Start with purchases you might return, need to prove, want to understand, or cannot afford to lose track of.`,
  },
  {
    q: 'Who probably does not need receipt scanning?',
    body: `### High-level numbers may be enough

If your only question is **“Did I keep total spending under $3,000 this month?”**, your bank, credit-card statement, or a traditional budgeting app may already give you what you need.

The same is true if you only want to track account balances, bills, net worth, or broad monthly categories. You do not need item-level receipt data to answer those questions.

**Receipt scanning becomes valuable when the total is not enough—when you need to know what you bought, protect a purchase, or keep itemized records.**`,
  },
  {
    q: 'Who actually benefits from scanning receipts?',
    body: `### People who need the story behind the total

Receipt scanning is most useful when line-item details matter. That includes:

* Households trying to separate food from personal and household goods
* Shoppers tracking price changes, returns, warranties, and proof of purchase
* Freelancers and small businesses organizing itemized expense records
* Employees who need detailed receipts for reimbursements
* Anyone who wants to search what they bought instead of only where they shopped

**If the individual item can change a decision later, the receipt is worth preserving.**`,
  },
  {
    q: 'Why digitize a paper receipt if I can keep it in a drawer?',
    body: `### The receipt was there—but the ink was gone

Months after buying an appliance, you open the drawer for the receipt. The paper is still there, but the thermal print has faded until the date and total are almost unreadable.

A digital copy preserves the available proof-of-purchase details for future returns, warranties, reimbursements, or records. The merchant, employer, insurer, or warranty provider still decides what documentation it accepts.

**Paper can fade before the value of the purchase does.**`,
  },
  {
    q: 'Why do freelancers and employees need itemized receipts?',
    body: `### A transaction total cannot explain the expense

A card statement may show **Office Depot — $146**, but it does not show which items were business supplies and which were personal. An employer may also require the line items—not only the card charge—before approving reimbursement.

Digitized receipts help preserve the merchant, date, items, tax, and total so you can organize business purchases and prepare reimbursement records. Tax treatment and audit requirements should always be confirmed with an accountant or the appropriate tax authority.

**The bank proves that money moved. The receipt helps document why.**`,
  },
  {
    q: 'Can scanning receipts reveal inflation and shrinkflation?',
    body: `### The price changed quietly

At checkout, you confirm that the coffee rang up at **$4.99**, not $5.99. Everything looks correct.

What the register check cannot tell you is that the same coffee cost **$3.49 three months ago**—or that the package now contains two fewer ounces.

Scanning receipts builds a purchase history you can use to compare prices, quantities, and repeat purchases over time. That makes subtle price creep easier to notice across staples such as milk, coffee, paper towels, and meat.

**One receipt verifies today’s price. A receipt history helps reveal how the price changed.**`,
  },
  {
    q: 'Why is my “grocery” spending never just groceries?',
    body: `### The $180 mixed cart

You leave Target or Costco with groceries, paper plates, shampoo, batteries, and a shirt. Your bank records one **$180** transaction and may label the entire purchase “Groceries.”

The receipt tells a more useful story. Perhaps **$110** was food while **$70** went to household and personal items.

GetGuac uses item-level receipt details to help separate what the single transaction total hides.

**Your bank sees one store. Your receipt sees the different needs inside the cart.**`,
  },
  {
    q: 'Can receipts expose spending leaks I do not notice?',
    body: `### Small extras become a pattern

One sparkling water, a few snacks, and a checkout impulse buy do not feel significant during a weekly trip. Repeated across a month, they can become a meaningful part of the grocery bill.

Item-level purchase history can help reveal patterns in snacks, beverages, convenience purchases, and frequently rebought products. It can also make it easier to compare what the same staple cost at different stores.

**The goal is not to judge one purchase. It is to make the pattern visible enough for you to decide whether it is worth changing.**`,
  },
  {
    q: 'How can receipt scanning make household expense splitting easier?',
    body: `### One cart, two people, several personal items

You and a partner or roommate share a **$200** shopping trip, but the cart includes cosmetics, specialty foods, and other personal purchases. Splitting the total in half would not be fair, and reconstructing the cart from memory is frustrating.

An itemized digital receipt gives the household a clear record of what was purchased and how much each item cost. That makes it easier to identify shared items and calculate a fair split using the payment method you already use.

**Instead of debating the total, work from the actual items.**`,
  },
  {
    q: 'My bank already tracks my spending. Why do I need GetGuac?',
    body: `### Imagine opening your bank app

It says **Target — $184.52**. That is accurate, but it does not explain the purchase. Was it groceries, school supplies, clothing, medicine, or all four?

The receipt tells the rest of the story. GetGuac turns those individual items into information you can search and understand.

**Your bank tells you where the money went. GetGuac helps you understand what you bought.**`,
  },
  {
    q: 'What real problem does GetGuac solve?',
    body: `### It usually starts with a small frustration

You need last month’s receipt. You cannot remember which card you used. The return deadline might be tomorrow. Your statement only shows a merchant name and total.

GetGuac gives those scattered purchase details a home. Instead of searching through drawers, inboxes, and statements, you can find the purchase and understand what happened.

**The problem is not buying something. It is losing the useful information after you buy it.**`,
  },
  {
    q: 'Will GetGuac actually save me money?',
    body: `### One alert can matter

Imagine finding a subscription you forgot, noticing a fee you can question, or seeing that a return window closes in two days. GetGuac did not create the savings—the opportunity was already there. It helped you notice it before it disappeared.

GetGuac cannot guarantee savings, and you decide what action to take.

**The value is seeing the right opportunity while there is still time to act.**`,
  },
  {
    q: 'Do I have to track every purchase for GetGuac to be useful?',
    body: `### Start with one receipt that matters

Maybe it is a laptop with a warranty, shoes you might return, a business meal, or a large grocery trip you want to understand.

Scan that one. Then scan the next receipt worth remembering. GetGuac can also receive e-receipts, so every purchase does not require a photo.

**You are building a useful purchase history—not assigning yourself homework.**`,
  },
  {
    q: 'Is this just another budgeting app?',
    body: `### A budget says “You spent $184 at Target”

GetGuac can help tell you what made up that $184, where the receipt is, which item may still be returnable, and what that purchase adds to your history.

Budgeting apps focus on planning and transaction categories. GetGuac focuses on the life of the purchase after checkout.

**It is not only about how much you spent. It is about understanding and protecting what you bought.**`,
  },
]

// Section banner copy. `icon` is a lucide export name resolved in FaqClient.
export const GROUP_META = {
  'Getting started': { icon: 'Rocket', blurb: 'Accounts, apps, pricing, and your first receipt.' },
  'Privacy & account': { icon: 'ShieldCheck', blurb: 'Your login, mailbox, privacy, and control.' },
  'Receipts & purchase data': { icon: 'ReceiptText', blurb: 'Why item-level purchase information matters.' },
  'Features & Guac-AI': { icon: 'Sparkles', blurb: 'What GetGuac can organize, find, and explain.' },
  'Why GetGuac': { icon: 'CircleDollarSign', blurb: 'Where GetGuac fits alongside banks and other apps.' },
  'Using GetGuac': { icon: 'HelpCircle', blurb: 'Practical answers for households and freelancers.' },
}

// The four things receipt data shows that a bank line never can. These sit
// ABOVE the topic cards because they are the argument for the product, not a
// support topic — the FAQ answers below then cover each one in full.
// `icon` is a lucide export name, resolved in FaqClient like GROUP_META.
export const FEATURED_CARDS = [
  {
    icon: 'TrendingUp',
    kicker: 'Price history',
    title: 'The "Inflation & Shrinkflation" Reality',
    body: 'Checking a receipt at the register confirms that the store charged $4.99 instead of $5.99. However, it does not show that the exact same item was $3.49 three months ago or that the box shrunk by two ounces.',
    callout: {
      label: 'The Value',
      text: 'Scanning receipts builds a historical price log, making it easy to identify subtle price creep across everyday staples like milk, coffee, paper towels, and meat.',
    },
    link: { q: "Can scanning receipts reveal inflation and shrinkflation?", label: 'Read the full answer' },
  },
  {
    icon: 'ShoppingCart',
    kicker: 'Categorisation',
    title: 'The "Mixed Cart" Problem',
    body: 'A typical $180 shopping trip to a store like Target or Costco often includes groceries alongside paper plates, shampoo, batteries, and clothing.',
    compare: [
      { label: 'Without Receipt Scanning', text: 'Bank statement logs show a $180 expense tagged simply as "Groceries."' },
      { label: 'With Receipt Scanning', text: 'The app categorizes food separately from household goods, showing that only $110 was spent on food while $70 went to non-grocery items.', good: true },
    ],
    link: { q: "Why is my “grocery” spending never just groceries?", label: 'Read the full answer' },
  },
  {
    icon: 'Search',
    kicker: 'Spending leaks',
    title: 'Identifying Unseen Household Leaks',
    body: 'Most shoppers misestimate where their grocery budget goes. Category breakdowns derived from receipts highlight surprising patterns:',
    bullets: [
      { label: 'Snack & Beverage Creep', text: 'Processed snacks, sparkling water, and checkout impulse buys can account for 20% to 30% of a monthly grocery bill.' },
      { label: 'Store Price Discrepancies', text: 'Comparing item prices reveals whether buying certain staples at a convenience market costs significantly more than purchasing them at a primary supermarket.' },
    ],
    link: { q: "Can receipts expose spending leaks I do not notice?", label: 'Read the full answer' },
  },
  {
    icon: 'Users',
    kicker: 'Sharing',
    title: 'Household Expense Splitting & Sharing',
    body: 'When living with a partner or roommates, splitting a $200 receipt manually is tedious if one person bought personal items like cosmetics or specific dietary products.',
    callout: {
      label: 'The Solution',
      text: 'Itemized scanning parses the receipt instantly, allowing users to select and split specific items instead of calculating totals by hand.',
    },
    link: { q: "How can receipt scanning make household expense splitting easier?", label: 'Read the full answer' },
  },
  {
    icon: 'Eye',
    wide: true,
    kicker: 'Price fairness',
    title: 'Surveillance Pricing & Personalised Prices',
    body: 'Surveillance pricing is when a retailer sets YOUR price from YOUR data — location, device, browsing history, past purchases, and inferred willingness to pay. The FTC confirmed in January 2025 that a wide range of personal data is used to set individualised prices, and two people can be shown different amounts for the same item. A displayed price alone cannot tell you which one you were shown.',
    bullets: [
      { label: 'Your own price log is the reference', text: 'A personalised price is only visible against something. Receipts record what YOU actually paid, by item, by store, by date — so when the same coffee rings up higher than your own history, you can see it instead of assuming prices went up.' },
      { label: 'Compare the item, not the offer', text: 'Steals watches the things you rebuy across retailers, so the number you judge a "deal" against comes from the market rather than from the seller showing you the price.' },
      { label: 'Give shopping its own identity', text: 'The free @getguac.app mailbox keeps merchant accounts, loyalty programmes and order confirmations out of your main inbox, so less of your shopping is tied to the email address that follows you everywhere.' },
    ],
    callout: {
      label: 'Honest limit',
      text: 'GetGuac cannot stop a retailer from personalising your price, and it does not claim to. What it can do is keep the evidence — your own itemised purchase history — so a price that quietly moved is something you can notice and act on.',
    },
    link: { q: 'Can GetGuac Help With Surveillance Pricing?', label: 'Read the full answer' },
    source: { href: 'https://en.wikipedia.org/wiki/Surveillance_pricing', label: 'What surveillance pricing is' },
  },
]

export const START_HERE = {
  name: 'Start here',
  icon: 'HelpCircle',
  blurb: 'The honest questions people ask first.',
}

export const ALL_FAQS = [...PRIORITY_FAQS, ...Object.values(FAQ_GROUPS).flat()]

// Stable anchor/id for a section name, used by the topic cards and the section
// banners so a link and its target can never drift apart.
export function sectionId(name) {
  return name.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')
}
