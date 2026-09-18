const photo=(id)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const products=[
{id:1,name:'The everyday linen shirt',price:1450,size:'M',brand:'Zara',category:'Tops',condition:'Like new',seller:'sara.edits',image:photo('photo-1598554747436-c9293d6a588f'),badge:'JUST LISTED'},
{id:2,name:'Vintage leather shoulder bag',price:2800,size:'One size',brand:'Vintage',category:'Accessories',condition:'Good',seller:'mimi.archive',image:photo('photo-1548036328-c9fa89d128fa'),badge:'RARE FIND'},
{id:3,name:'Relaxed indigo denim',price:1900,size:'S',brand:'Levi’s',category:'Bottoms',condition:'Like new',seller:'dani.closet',image:photo('photo-1542272604-787c3835535d')},
{id:4,name:'The weekend sneakers',price:3200,size:'39',brand:'Nike',category:'Shoes',condition:'Good',seller:'sara.edits',image:photo('photo-1549298916-b41d501d3772'),badge:'PRICE DROP'},
{id:5,name:'The cream crochet top',price:1650,size:'M',brand:'Mango',category:'Tops',condition:'Like new',seller:'mimi.archive',image:photo('photo-1434389677669-e08b4cac3105')},
{id:6,name:'The statement red dress',price:2400,size:'S',brand:'Zara',category:'Dresses',condition:'Like new',seller:'dani.closet',image:photo('photo-1595777457583-95e059d581b8')},
];
export const hero=photo('photo-1483985988355-763728e1935b');
export const money=n=>`${Number(n).toLocaleString()} ETB`;
