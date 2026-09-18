import test from 'node:test';
import assert from 'node:assert/strict';
import {marketplaceUrl,isMarketplaceNavigation} from '../mobile/lib/url.ts';
test('mobile releases require a reachable HTTPS origin without embedded credentials',()=>{
 assert.equal(marketplaceUrl('https://marketplace.example.test',false),'https://marketplace.example.test');
 assert.equal(marketplaceUrl(undefined,true),'http://127.0.0.1:5173');
 for(const value of [undefined,'http://marketplace.example.test','https://localhost','https://127.0.0.1','https://[::1]','https://user:secret@marketplace.example.test','https://marketplace.example.test/private','https://marketplace.example.test/?token=x'])assert.throws(()=>marketplaceUrl(value,false));
});
test('mobile navigation cannot change origin, port or scheme',()=>{
 const origin='https://marketplace.example.test';
 assert.equal(isMarketplaceNavigation(`${origin}/#checkout/123`,origin),true);
 for(const value of ['https://marketplace.example.test.attacker.test','https://marketplace.example.test:444','http://marketplace.example.test','javascript:alert(1)','intent://host','data:text/html,test','file:///data/local','https://attacker.test'])assert.equal(isMarketplaceNavigation(value,origin),false);
});
