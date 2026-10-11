import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestApp,expectStatus} from './helpers.mjs';
import {signupBody,details} from './fixtures.mjs';

test('two accounts choose private interests, publish, discover, save and message',async t=>{
 const h=await startTestApp();t.after(()=>h.close());
 const post=(route,token,body)=>h.request(route,{method:'POST',token,body});
 for(const value of [undefined,'invalid',null,['both']])expectStatus(await post('/auth/signup',null,{...signupBody('seller'),shopping_interest:value}),400);
 const seller=expectStatus(await post('/auth/signup',null,{...signupBody('seller'),shopping_interest:'womenswear'}),200);
 const buyer=expectStatus(await post('/auth/signup',null,{...signupBody('buyer'),shopping_interest:'menswear'}),200);
 expectStatus(await post('/security/preferences',null,{shopping_interest:'both'}),401);
 expectStatus(await post('/security/preferences',buyer.token,{shopping_interest:'unknown'}),400);
 expectStatus(await post('/security/preferences',buyer.token,{shopping_interest:'both',user_id:seller.user.id}),200);
 const listing=expectStatus(await post('/listings',seller.token,details),200).listing;
 let feed=expectStatus(await h.request('/bootstrap',{token:buyer.token}),200);
 assert.ok(feed.listings.some(p=>p.id===listing.id));
 assert.equal(feed.preferences.shopping_interest,'both');
 assert.ok(feed.users.every(u=>!('shopping_interest' in u)&&!('preferences' in u)));
 assert.equal(expectStatus(await h.request('/bootstrap'),200).preferences,null);
 assert.equal(expectStatus(await h.request('/bootstrap',{token:seller.token}),200).preferences.shopping_interest,'womenswear');
 expectStatus(await post(`/saved/${listing.id}`,buyer.token,{saved:true}),200);
 const chat=expectStatus(await post('/conversations',buyer.token,{listing_id:listing.id}),200);
 const id=chat.conversation.id;
 expectStatus(await post(`/conversations/${id}/messages`,buyer.token,{body:'Is this piece still available?',client_message_id:'milestone-message'}),200);
 assert.ok(expectStatus(await h.request(`/conversations/${id}`,{token:seller.token}),200).conversation.messages.some(m=>m.body==='Is this piece still available?'));
 await h.restart();
 feed=expectStatus(await h.request('/bootstrap',{token:buyer.token}),200);
 assert.equal(feed.preferences.shopping_interest,'both');assert.ok(feed.saved.includes(listing.id));
 // Existing accounts can have no preference; do not invent consent or an interest.
 await h.app.db.query('DELETE FROM shopping_preferences WHERE user_id=$1',[seller.user.id]);
 assert.equal(expectStatus(await h.request('/bootstrap',{token:seller.token}),200).preferences,null);
});
