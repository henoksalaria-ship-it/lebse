import React,{useEffect,useRef,useId} from 'react';
import {ArrowLeft,ChevronRight,Heart,X} from 'lucide-react';
import {price} from './data';
export function Button({children,secondary=false,...props}){return <button className={`button ${secondary?'secondary':''}`} {...props}>{children}</button>;}
export function IconButton({label,children,...props}){return <button className="icon-button" aria-label={label} {...props}>{children}</button>;}
export function Header({title,back,children}){return <header className="topbar">{back?<IconButton label="Back" onClick={back}><ArrowLeft size={21}/></IconButton>:<span className="wordmark">lebse<span>.</span></span>}{back&&<strong>{title}</strong>}<div className="header-tools">{children}</div></header>;}
export function PieceCard({item,saved,onSave,onOpen}){return <article className="piece"><div className="piece-image"><button className="image-button" aria-label={`View ${item.name}`} onClick={onOpen}><img src={item.image} alt={item.name} loading="lazy"/></button><IconButton label={`${saved?'Unsave':'Save'} ${item.name}`} aria-pressed={saved} onClick={onSave}><Heart size={21} fill={saved?'currentColor':'none'}/></IconButton></div><button className="piece-copy" onClick={onOpen}><span>{item.name}</span><strong>{price(item.price)} <small>{item.size}</small></strong><span className="muted">{item.condition}</span></button></article>;}
export function Row({icon:Icon,children,detail,onClick,danger=false}){return <button className={`row ${danger?'danger':''}`} onClick={onClick}>{Icon&&<Icon size={21}/>}<span>{children}{detail&&<small>{detail}</small>}</span><ChevronRight size={18}/></button>;}
export function Sheet({title,onClose,children}){
 const titleId=useId(),dialog=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const prior=document.activeElement;dialog.current.showModal();return()=>{prior?.focus?.();};},[]);
 return <dialog ref={dialog} className="sheet" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close.current();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)onClose();}}}><div className="sheet-grabber"/><div className="sheet-title"><h2 id={titleId}>{title}</h2><IconButton label="Close sheet" onClick={onClose}><X size={21}/></IconButton></div>{children}</dialog>;
}
export function Empty({title,children}){return <div className="empty"><h2>{title}</h2><p className="muted">{children}</p></div>;}
