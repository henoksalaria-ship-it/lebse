export const discoveryCategories=['Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories'];
export const emptyFilters={q:'',categories:[],sizes:[],conditions:[],min:50,max:50000,sort:'relevance'};
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function cleanFilters(input={}){
 const many=(key,valid)=>Array.isArray(input[key])?[...new Set(input[key].filter(v=>typeof v==='string'&&v.length<=30&&(!valid||valid.includes(v))))].slice(0,15):[];
 const price=(value,fallback)=>Number.isInteger(Number(value))&&Number(value)>=50&&Number(value)<=50000?Number(value):fallback;
 return {q:typeof input.q==='string'?input.q.trim().slice(0,100):'',categories:many('categories',discoveryCategories),sizes:many('sizes'),conditions:many('conditions',['Like new','Good','Fair']),min:price(input.min,50),max:price(input.max,50000),sort:['relevance','newest','low','high'].includes(input.sort)?input.sort:'relevance'};
}
function near(a,b){if(a.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(i<a.length||j<b.length?1:0)<=1;}
export function searchPieces(items,input){const f=cleanFilters(input),tokens=normalize(f.q).split(' ').filter(Boolean);return items.map(p=>{
 if(f.categories.length&&!f.categories.includes(p.category)||f.sizes.length&&!f.sizes.includes(p.size)||f.conditions.length&&!f.conditions.includes(p.condition)||p.price<f.min||p.price>f.max)return null;
 const fields=[[p.name,10],[p.brand,7],[p.category,5],[p.seller,5],[p.seller_name,4],[p.size,3],[p.description,1]].map(([v,w])=>[normalize(v),w]);let score=0;
 for(const token of tokens){let best=0;for(const [value,weight] of fields){const words=value.split(' ');if(words.includes(token))best=Math.max(best,weight*3);else if(words.some(w=>w.startsWith(token)))best=Math.max(best,weight*2);else if(words.some(w=>near(token,w)))best=Math.max(best,weight);}if(!best)return null;score+=best;}
 if(tokens.length&&fields[0][0].includes(normalize(f.q)))score+=30;return {p,score};
 }).filter(Boolean).sort((a,b)=>(f.sort==='low'?a.p.price-b.p.price:f.sort==='high'?b.p.price-a.p.price:f.sort==='relevance'?b.score-a.score:0)||new Date(b.p.created_at)-new Date(a.p.created_at)||String(a.p.id).localeCompare(String(b.p.id))).map(x=>x.p);}
