import editorial from './assets/editorial.png';
import linen from './assets/linen.png';
import knit from './assets/knit.png';
export const images={editorial,linen,knit};
export const pieces=[
 {id:'linen',name:'Linen jacket',price:1800,size:'M',condition:'Very good',category:'Outerwear',image:linen,description:'Natural linen, a relaxed shoulder and just the right amount of structure. Lightly worn; a small mark inside the cuff is noted by the seller.'},
 {id:'knit',name:'Cable knit sweater',price:1200,size:'S',condition:'Good',category:'Knitwear',image:knit,description:'A rich chestnut knit with a soft, lived-in feel. Light pilling at the cuffs. Ready for another chapter.'},
];
export const price=n=>`${Number(n).toLocaleString('en-US')} ETB`;
