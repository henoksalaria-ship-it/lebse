import {PrivacyImage} from './privacy-media';
import React, { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Heart, LoaderCircle, Search, ShoppingBag, TriangleAlert, X } from 'lucide-react';
import './ui.css';

const classes = (...items) => items.filter(Boolean).join(' ');
const amountFormat = new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 });
const renderIcon = (Icon, props = {}) => {
  if (!Icon) return null;
  if (isValidElement(Icon)) return cloneElement(Icon, { 'aria-hidden': true, ...props });
  if (typeof Icon === 'string') return <span aria-hidden="true">{Icon}</span>;
  return <Icon aria-hidden="true" {...props} />;
};

export function Button({ children, variant = 'primary', loading = false, disabled = false, type = 'button', className, icon, ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes('ui-button', `ui-button--${variant}`, className)}>
    {loading ? <LoaderCircle size={18} className="ui-spin" aria-hidden="true" /> : renderIcon(icon, { size: 18 })}
    <span>{children}</span>
  </button>;
}

export function IconButton({ label, children, icon, className, type = 'button', ...props }) {
  return <button {...props} type={type} aria-label={label} title={label} className={classes('ui-icon-button', className)}>{children || renderIcon(icon, { size: 21 })}</button>;
}

export function Tabs({ items, value, onChange, label = 'Sections', className }) {
  const group = useRef(null);
  function onKeyDown(event, index) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].value);
    group.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }
  return <div className={classes('ui-tabs', className)} role="tablist" aria-label={label} ref={group}>
    {items.map((item, index) => <button type="button" role="tab" aria-selected={value === item.value} aria-controls={item.panelId} tabIndex={value === item.value || (!items.some(option => option.value === value) && index === 0) ? 0 : -1} key={item.value} onClick={() => onChange(item.value)} onKeyDown={event => onKeyDown(event, index)}>
      {item.label}{item.count != null ? <span className="ui-count">{item.count}</span> : null}
    </button>)}
  </div>;
}

export function Chip({ active = false, children, onClick, className, ...props }) {
  return <button {...props} type="button" aria-pressed={active} onClick={onClick} className={classes('ui-chip', active && 'ui-chip--active', className)}>{children}</button>;
}

export function Field({ label, error, hint, children, className, required = false, id: providedId }) {
  const generatedId = useId();
  const controlId = providedId || (isValidElement(children) && children.props.id) || `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : '';
  const errorId = error ? `${controlId}-error` : '';
  const control = isValidElement(children) ? cloneElement(children, {
    id: controlId,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': classes(children.props['aria-describedby'], hintId, errorId) || undefined,
    required: required || children.props.required || undefined,
  }) : children;
  return <div className={classes('ui-field', error && 'ui-field--error', className)}>
    <label htmlFor={controlId}>{label}{required ? <span className="ui-required" aria-hidden="true"> *</span> : null}</label>
    {control}
    {hint ? <span className="ui-field-hint" id={hintId}>{hint}</span> : null}
    {error ? <span className="ui-field-error" id={errorId} role="alert">{error}</span> : null}
  </div>;
}

export function SearchField({ value, onChange, onSubmit, placeholder = 'Search for your next find', label = 'Search listings', className }) {
  function submit(event) { event.preventDefault(); onSubmit?.(value); }
  return <form role="search" aria-label={label} className={classes('ui-search', className)} onSubmit={submit}>
    <Search size={21} aria-hidden="true" />
    <input aria-label={label} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    {value ? <IconButton label="Clear search" onClick={() => onChange('')}><X size={18} aria-hidden="true" /></IconButton> : null}
    {onSubmit ? <IconButton label="Search" type="submit"><ArrowRight size={20} aria-hidden="true" /></IconButton> : null}
  </form>;
}

const statusLabels = {
  active: 'Available', draft: 'Draft', reserved: 'Reserved', sold: 'Sold', removed: 'Removed',
  pending: 'Pending', accepted: 'Accepted', countered: 'Counteroffer', declined: 'Declined', expired: 'Expired', withdrawn: 'Withdrawn',
  payment_pending: 'Awaiting payment', awaiting_payment: 'Awaiting payment', paid: 'Paid', ready: 'Ready for pickup', ready_for_pickup: 'Ready for pickup',
  shipped: 'On the way', in_transit: 'On the way', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
  failed: 'Failed', refunded: 'Refunded', processing: 'Processing', held: 'Held', released: 'Released', disputed: 'Disputed',
};

export function Badge({ status = 'neutral', children, className }) {
  const normalized = String(status).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return <span className={classes('ui-badge', `ui-badge--${normalized}`, className)}>{children || statusLabels[status] || String(status).replaceAll('_', ' ')}</span>;
}

let modalLocks = 0;
let originalOverflow = '';

export function Modal({ title, onClose, children, actions, description, className, sheet = false }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    if (modalLocks === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalLocks += 1;
    element.showModal();
    // Native dialogs make the background inert; explicit cycling also handles
    // content whose controls change while a form is loading or being validated.
    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll('button, [href], input, select, textarea, [tabindex]')]
        .filter(control => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); element.focus(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function onCancel(event) { event.preventDefault(); onCloseRef.current?.(); }
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('cancel', onCancel);
    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('cancel', onCancel);
      element.close();
      modalLocks = Math.max(0, modalLocks - 1);
      if (modalLocks === 0) document.body.style.overflow = originalOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  function onBackdropClick(event) {
    if (event.target !== dialog.current) return;
    const bounds = dialog.current.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose?.();
  }

  // Portal events still bubble through React parents, including checkout forms.
  return createPortal(<dialog ref={dialog} aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={classes('ui-modal', sheet && 'ui-modal--sheet', className)} onClick={onBackdropClick} onSubmit={event => event.stopPropagation()}>
    {sheet ? <div className="ui-sheet-handle" aria-hidden="true" /> : null}
    <div className="ui-modal-header"><h2 id={titleId}>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={22} aria-hidden="true" /></IconButton></div>
    {description ? <p className="ui-modal-description" id={descriptionId}>{description}</p> : null}
    <div className="ui-modal-body">{children}</div>
    {actions ? <div className="ui-modal-actions">{actions}</div> : null}
  </dialog>, document.body);
}

export function Sheet(props) { return <Modal {...props} sheet />; }

export function Toast({ message, onClose }) {
  if (!message) return null;
  return <div className="ui-toast" role="status" aria-live="polite" aria-atomic="true"><Check size={19} aria-hidden="true" /><span>{message}</span>{onClose ? <IconButton label="Dismiss message" onClick={onClose}><X size={19} aria-hidden="true" /></IconButton> : null}</div>;
}

export function EmptyState({ title = 'Nothing here just yet', description, action, onAction, icon = ShoppingBag, children }) {
  return <div className="ui-empty"><span className="ui-empty-icon">{renderIcon(icon, { size: 29, strokeWidth: 1.5 })}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}{action && onAction ? <Button onClick={onAction}>{action}<ArrowRight size={17} aria-hidden="true" /></Button> : null}{children}</div>;
}

export function LoadingState({ label = 'Loading your next finds…', count = 4 }) {
  return <div className="ui-loading" role="status" aria-live="polite" aria-busy="true"><div className="ui-loading-label"><LoaderCircle size={18} className="ui-spin" aria-hidden="true" />{label}</div><div className="ui-skeleton-grid" aria-hidden="true">{Array.from({ length: count }, (_, index) => <div key={index} className="ui-skeleton-card"><div className="ui-skeleton-photo" /><div className="ui-skeleton-line" /><div className="ui-skeleton-line ui-skeleton-line--short" /></div>)}</div></div>;
}

export function ErrorState({ message = 'We could not load this page. Please try again.', onRetry }) {
  return <div className="ui-error" role="alert"><span className="ui-empty-icon"><TriangleAlert size={29} strokeWidth={1.5} aria-hidden="true" /></span><h2>A little interruption</h2><p>{message}</p>{onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}</div>;
}

export function PageHeader({ title, description, onBack, children, eyebrow }) {
  return <header className="ui-page-header">{onBack ? <button type="button" className="ui-back" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Back</button> : null}<div className="ui-page-heading"><div>{eyebrow ? <span className="ui-eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{children}</div></header>;
}

function initials(name = '') { return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'L'; }

export function ProductCard({ product, saved = false, onSave, onOpen, onSeller }) {
  const title = product.title || product.name || 'Untitled listing';
  const image = product.image || product.media?.[0]?.url || product.media?.[0]?.path || (typeof product.media?.[0] === 'string' ? product.media[0] : null);
  const price = product.priceETB ?? product.price_etb ?? product.price ?? 0;
  const sellerName = product.seller_name || product.seller?.name || product.seller?.display_name || 'View closet';
  const sellerId = product.seller_id || product.seller?.id || product.seller?.user_id;
  const unavailable = product.status === 'sold' || product.status === 'reserved';
  return <article className={classes('ui-product-card', unavailable && 'ui-product-card--unavailable')}>
    <div className="ui-product-media"><button type="button" className="ui-product-image" aria-label={`View ${title}`} onClick={() => onOpen?.(product)}><ShoppingBag className="ui-product-placeholder" size={36} aria-hidden="true" />{image ? <PrivacyImage src={image} alt={title} loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = 'none'; }} /> : null}</button>
      {unavailable ? <Badge status={product.status} /> : null}
      {onSave ? <IconButton label={saved ? `Unsave ${title}` : `Save ${title}`} aria-pressed={saved} className={classes('ui-save', saved && 'ui-save--active')} onClick={() => onSave(product)}><Heart size={20} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.7} aria-hidden="true" /></IconButton> : null}
    </div>
    <div className="ui-product-summary"><strong>{amountFormat.format(price)} <span>ETB</span></strong>{product.size ? <span className="ui-product-size">{product.size}</span> : null}</div>
    <button type="button" className="ui-product-title" onClick={() => onOpen?.(product)}>{title}</button>
    {product.condition ? <div className="ui-product-condition">{String(product.condition).replaceAll('_', ' ')}</div> : null}
    {onSeller && sellerId ? <button type="button" className="ui-product-seller" onClick={() => onSeller(sellerId)}><span className="ui-mini-avatar" aria-hidden="true">{initials(sellerName)}</span><span>{sellerName}</span><ChevronRight size={13} aria-hidden="true" /></button> : <div className="ui-product-seller"><span className="ui-mini-avatar" aria-hidden="true">{initials(sellerName)}</span><span>{sellerName}</span></div>}
  </article>;
}

export function SellerCard({ seller, onOpen, onFollow, following = false }) {
  const name = seller.name || seller.display_name || seller.seller_name || 'Seller';
  const listingCount = seller.listing_count ?? seller.listings_count;
  return <div className="ui-seller-card"><button type="button" className="ui-seller-open" onClick={() => onOpen?.(seller)} aria-label={`Visit ${name}'s closet`}><span className="ui-avatar" aria-hidden="true">{seller.avatar_url ? <PrivacyImage src={seller.avatar_url} alt="" loading="lazy" /> : initials(name)}</span><span className="ui-seller-info"><strong>{name}</strong><span>{seller.location || 'Lebse member'}{listingCount != null ? ` · ${listingCount} ${listingCount === 1 ? 'piece' : 'pieces'}` : ''}</span></span><ChevronRight size={19} aria-hidden="true" /></button>{onFollow ? <Button variant="secondary" onClick={() => onFollow(seller)} aria-pressed={following}>{following ? 'Following' : 'Follow'}</Button> : null}</div>;
}

export function BottomNav({ items, active, onChange, unread = 0 }) {
  return <nav className="ui-bottom-nav" aria-label="Main navigation">{items.map(item => {
    const count = typeof unread === 'object' ? unread[item.id] : (item.id === 'inbox' ? unread : 0);
    return <button type="button" className={classes(active === item.id && 'ui-bottom-nav-active', item.id === 'sell' && 'ui-bottom-nav-sell')} key={item.id} aria-current={active === item.id ? 'page' : undefined} aria-label={`${item.label}${count ? `, ${count} unread` : ''}`} onClick={() => onChange(item.id)}><span className="ui-nav-icon">{renderIcon(item.icon, { size: 23, strokeWidth: 1.65 })}{count ? <span className="ui-nav-unread" aria-hidden="true">{count > 9 ? '9+' : count}</span> : null}</span><span>{item.label}</span></button>;
  })}</nav>;
}
