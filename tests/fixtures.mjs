import {legal} from '../server/security.mjs';
import {expectStatus,TEST_PASSWORD} from './helpers.mjs';
export const terms={accept_terms:true,age_confirmed:true,terms_version:legal.version};
export const address={name:'Test Buyer',phone:'0911223344',street:'Test street 10',area:'Bole',lat:9,lon:38.7};
export const parcel={weight_kg:1,length_cm:30,width_cm:25,height_cm:8};
export const details={name:'Test cotton summer shirt',price:1000,brand:'Unbranded',size:'M',category:'Tops',condition:'Good',description:'A soft cotton shirt in good condition with a relaxed fit.',allow_offers:true,images:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=']};
export const signupBody=name=>({name,username:name,email:`${name}@example.test`,password:TEST_PASSWORD,shopping_interest:'both',...terms});
export async function confirmPickup(h,seller,orderId){const q=expectStatus(await h.request(`/experience/orders/${orderId}/pickup`,{token:seller.token}),200).quote;expectStatus(await h.request(`/experience/orders/${orderId}/pickup`,{method:'POST',token:seller.token,body:{quote_id:q.id,confirmed:true,notes:'Confirmed for delivery integration test.'}}),200);}
export async function signup(h,name){return expectStatus(await h.request('/auth/signup',{method:'POST',body:signupBody(name)}),200);}
export async function createOrder(h,seller,buyer,changes={}){const post=(route,token,body)=>h.request(route,{method:'POST',token,body});await post('/delivery/pickup',seller.token,{address,parcel});const p=expectStatus(await post('/listings',seller.token,{...details,...changes}),200).listing;const order=expectStatus(await post('/orders',buyer.token,{listing_id:p.id,version:p.version}),200).order;const quote=expectStatus(await post(`/orders/${order.id}/delivery/quote`,buyer.token,{address}),200).quote;return {order,quote,p,pay:{address,delivery_quote_id:quote.id,outcome:'success',idempotency_key:crypto.randomUUID()}};}
