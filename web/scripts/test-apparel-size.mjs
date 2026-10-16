import test from 'node:test';import assert from 'node:assert/strict';import {sameApparelSize} from '../src/lib/find-your-10/apparel-size.mjs';
import {priceOptions} from '../src/lib/find-your-10/price-discovery.mjs'
import {quickOpportunities} from '../src/lib/find-your-10/quick-plan.mjs'
import {purchasePlanRows} from '../src/lib/find-your-10/purchase-plan.mjs'
test('real Nike sock model is not a size, and recorded apparel categories govern ambiguous names',()=>{
 const product='Nike Everyday Plus Cushioned Training Crew Socks 6 Pairs SX6897-904'
 assert.equal(sameApparelSize(product,product+' size M'),false)
 assert.equal(sameApparelSize(product+' size M',product+' size L'),false)
 assert.equal(sameApparelSize(product+' size M',product+' size M'),true)
 assert.equal(sameApparelSize('Everyday essential','Everyday essential M','Clothing'),false)
 assert.equal(sameApparelSize('Everyday essential M','Everyday essential L','Clothing'),false)
 assert.equal(sameApparelSize('Everyday essential M','Everyday essential M','Clothing'),true)
 assert.equal(sameApparelSize('Fuel tank 10 gallon','Fuel tank 10 gallon','Auto'),true)
})
test('unknown recorded clothing size blocks both fresh and cached alternatives while Keep remains available',()=>{
 const now=new Date('2026-10-16T12:00:00Z')
 const item={id:'synthetic-apparel',receipt_id:'synthetic-receipt',item_name:'Everyday essential',category:'Clothing',qty:1,price:80,receipts:{date:'2026-10-15',store_name:'Synthetic test merchant'}}
 const listing={title:'Everyday essential M',store:'Synthetic seller',price:40,url:'https://example.test/product',available:true}
 assert.deepEqual(priceOptions([listing],{title:item.item_name,rows:[item]},now),[])
 const quote={key:'quote:cached',choice:listing.title,sourceUrl:listing.url,sourceLabel:'Product',store:listing.store,alternativeCents:4000,available:true,expiresAt:'2026-10-17'}
 const data={items:[item],priceQuotes:{'everyday essential':{status:'found',options:[quote]}}}
 assert.deepEqual(quickOpportunities(data,now),[])
 const rows=purchasePlanRows(data,now);assert.equal(rows.length,1);assert.equal(rows[0].keepOnly,true);assert.match(rows[0].reason,/size/)
})
test('apparel requires an explicit matching size',()=>{assert.equal(sameApparelSize('Nike shirt M','Nike shirt M'),true);assert.equal(sameApparelSize('Nike shirt M','Nike shirt L'),false);assert.equal(sameApparelSize('Nike shirt','Nike shirt M'),false);assert.equal(sameApparelSize('Nike shirt M','Nike shirt'),false);assert.equal(sameApparelSize('Nike shirt M','Nike shirt S M L'),false);assert.equal(sameApparelSize('Nike Downshifter 13','Nike shoes size 13'),false);assert.equal(sameApparelSize('Nike shoes size 10 US','Nike shoes size 10 UK'),false);assert.equal(sameApparelSize('Eggs 12 count','Eggs 12 count'),true)})
test('explicit size aliases preserve case, shoe systems and ambiguity',()=>{
 assert.equal(sameApparelSize("Men's shirt Medium","Men's shirt size m"),true)
 assert.equal(sameApparelSize('Nike shoes US 10','Nike shoes size 10 US'),true)
 assert.equal(sameApparelSize('Nike shoes US 10','Nike shoes UK 10'),false)
 assert.equal(sameApparelSize('Shirt Extra Large','Shirt XL'),true)
 assert.equal(sameApparelSize('Shirt Large','Shirt Small Medium Large'),false)
})
