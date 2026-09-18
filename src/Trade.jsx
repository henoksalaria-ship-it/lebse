import {BetterInbox} from './Inbox';
import {AddressPicker} from './AccountTools';
import {PickupConfirmation} from './OrderProblems';
import {api} from './api';
import {DeliveryQuote,DeliveryStatus,deliveryAddress} from './Delivery';
import {ReportButton} from './Safety';
import {PrivacyImage} from './privacy-media';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, CreditCard, HeartHandshake, MessageCircle, Package, Send, ShoppingBag, Star, Truck, TriangleAlert, XCircle } from 'lucide-react';
import { useResource, useStore } from './store';
import { money, when } from './api';
import { Badge, Button, Chip, EmptyState, ErrorState, Field, LoadingState, PageHeader, Sheet, Tabs } from './ui';
import './trade.css';

const identity = person => person?.name || person?.username || 'Lebse member';
const listingName = item => item?.name || item?.title || 'Your piece';
const uuid = () => crypto.randomUUID();
const stageNames = { awaiting_payment: 'Awaiting payment', paid: 'Payment confirmed', preparing: 'Being prepared', ready: 'Ready for pickup', in_transit: 'On the way', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' };

function SignInPrompt() {
  const s = useStore();
  return <section className="page trade-page trade-narrow"><EmptyState icon={HeartHandshake} title="Your next chapter starts here" description="Sign in to keep your conversations, offers, and orders together." action="Sign in" onAction={() => s.requireUser()} /></section>;
}

function TestNote({ children }) {
  return <div className="trade-test-note"><span>LOCAL TEST</span><p>{children || 'No real money is charged. Payment and courier updates are simulated for this local marketplace.'}</p></div>;
}

function InlineError({ message }) { return message ? <p className="trade-inline-error" role="alert"><TriangleAlert size={18} aria-hidden="true" />{message}</p> : null; }

function ItemSummary({ item, amount, onOpen, extra }) {
  return <div className="trade-item"><button type="button" className="trade-item-image" onClick={onOpen} aria-label={`View ${listingName(item)}`}>{item?.image || item?.images?.[0] ? <PrivacyImage src={item.image || item.images[0]} alt={listingName(item)} /> : <ShoppingBag size={26} aria-hidden="true" />}</button><div><button type="button" className="trade-item-title" onClick={onOpen}>{listingName(item)}</button><p>{[item?.brand, item?.size ? `Size ${item.size}` : ''].filter(Boolean).join(' · ')}</p>{amount != null ? <strong>{money(amount)}</strong> : null}{extra}</div></div>;
}

function OrderRow({ order, s }) {
  const buying = order.buyer_id === s.user.id;
  return <button type="button" className="trade-order-row" onClick={() => s.go('order', order.id)}><span className="trade-row-photo">{order.item?.image ? <PrivacyImage src={order.item.image} alt="" /> : <Package size={25} aria-hidden="true" />}</span><span className="trade-row-content"><strong>{listingName(order.item)}</strong><span>{buying ? `From ${identity(order.seller)}` : `For ${identity(order.buyer)}`} · {money(order.amount)}</span><Badge status={order.state}>{stageNames[order.state]}</Badge></span><ChevronRight size={20} aria-hidden="true" /></button>;
}

export function Inbox(){return <BetterInbox/>;}

export function Chat({ id }) {
  const s = useStore();
  const resource = useResource(`/conversations/${encodeURIComponent(id)}`);
  const conversation = s.conversations.find(item => item.id === id) || resource.value?.conversation;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [offerSheet, setOfferSheet] = useState(null);
  const [amount, setAmount] = useState('');
  const [offerError, setOfferError] = useState('');
  const messageAttempt = useRef(null);
  const messagesElement = useRef(null);
  const followMessages = useRef(true);
  const acknowledged=useRef(null);
  function acknowledge(){const last=conversation?.messages?.at(-1);if(!last||!conversation.unread_count||document.visibilityState!=='visible'||!followMessages.current||acknowledged.current===last.id)return;acknowledged.current=last.id;api(`/experience/conversations/${id}/read`,{method:'POST',body:{message_id:last.id}}).then(()=>s.refresh()).catch(()=>{acknowledged.current=null;});}
  useEffect(()=>{acknowledge();const visible=()=>acknowledge();document.addEventListener('visibilitychange',visible);return()=>document.removeEventListener('visibilitychange',visible);},[id,conversation?.messages?.at(-1)?.id,conversation?.unread_count]);

  useEffect(() => { setDraft(''); setError(''); setOfferSheet(null); messageAttempt.current = null; followMessages.current = true; }, [id]);
  useEffect(() => { if (messagesElement.current && followMessages.current) messagesElement.current.scrollTop = messagesElement.current.scrollHeight; }, [conversation?.messages?.length]);

  if (!s.loading && !s.user) return <SignInPrompt />;
  if (!conversation && (resource.loading || s.loading)) return <section className="page"><LoadingState label="Opening the conversation…" count={2} /></section>;
  if (!conversation) return <section className="page"><ErrorState message={resource.error || 'This conversation is unavailable.'} onRetry={resource.reload} /></section>;
  const isBuyer = conversation.buyer_id === s.user?.id;
  const openOffer = conversation.offers.find(offer => offer.status === 'pending');
  const proposer = openOffer?.proposer_id === s.user.id;
  const associatedOrder = s.orders.find(order => order.listing_id === conversation.listing.id && order.buyer_id === conversation.buyer_id );
  const minimumOffer = Math.max(50, Math.ceil(conversation.listing.price * .5));

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    if (messageAttempt.current?.body !== body) messageAttempt.current = { body, key: uuid() };
    setBusy('message'); setError('');
    try { await s.act(`/conversations/${id}/messages`, { body, client_message_id: messageAttempt.current.key }); setDraft(''); messageAttempt.current = null; followMessages.current = true; }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function respond(action) {
    if (!openOffer || busy) return;
    setBusy(action); setError('');
    try {
      const result = await s.act(`/offers/${openOffer.id}/action`, { action, version: openOffer.version }, action === 'accept' ? 'Offer accepted. The piece is reserved for payment.' : action === 'withdraw' ? 'Offer withdrawn.' : 'Offer declined.');
      if (result.order) s.go(isBuyer ? 'checkout' : 'order', result.order.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function submitOffer(event) {
    event.preventDefault();
    if (busy) return;
    if (offerSheet === 'counter' && !openOffer) { setOfferError('This offer is no longer open. Close this sheet to see the latest conversation.'); return; }
    const value = Number(amount);
    if (!Number.isInteger(value) || value < minimumOffer || value > conversation.listing.price) { setOfferError(`Enter a whole amount from ${money(minimumOffer)} to ${money(conversation.listing.price)}.`); return; }
    setBusy('offer'); setOfferError('');
    try {
      const counter = offerSheet === 'counter';
      await s.act(counter ? `/offers/${openOffer.id}/action` : '/offers', counter ? { action: 'counter', amount: value, version: openOffer.version } : { listing_id: conversation.listing.id, amount: value }, counter ? 'Counteroffer sent.' : 'Offer sent.');
      setOfferSheet(null);
    } catch (e) { setOfferError(e.message); }
    finally { setBusy(''); }
  }

  const beginOffer = kind => { setOfferSheet(kind); setOfferError(''); setAmount(String(openOffer?.amount || Math.max(minimumOffer, Math.round(conversation.listing.price * .85)))); };
  return <section className="page trade-page trade-chat"><PageHeader title={identity(conversation.other)} description={`@${conversation.other?.username || 'closet'} · ${isBuyer ? 'Seller' : 'Buyer'}`} onBack={() => s.go('inbox')}><Button variant="text" onClick={() => s.go('closet', conversation.other.id)}>View profile <ArrowRight size={17} aria-hidden="true" /></Button></PageHeader>
    <div className="trade-chat-quicklinks"><Button variant="secondary" onClick={()=>s.go('product',conversation.listing.id)}>View piece</Button>{associatedOrder&&<Button variant="secondary" onClick={()=>s.go('order',associatedOrder.id)}>View order · {stageNames[associatedOrder.state]}</Button>}</div><div className="trade-chat-layout"><aside className="trade-chat-piece"><ItemSummary item={conversation.listing} amount={conversation.listing.price} onOpen={() => s.go('product', conversation.listing.id)} /><Badge status={conversation.listing.status} />
      {associatedOrder ? <div className="trade-chat-order"><p>{isBuyer && associatedOrder.state === 'awaiting_payment' ? 'Your piece is reserved. Complete payment before the reservation ends.' : 'Keep track of this piece’s next chapter.'}</p><Button onClick={() => s.go(isBuyer && associatedOrder.state === 'awaiting_payment' ? 'checkout' : 'order', associatedOrder.id)}>{isBuyer && associatedOrder.state === 'awaiting_payment' ? 'Go to checkout' : 'View order'}<ArrowRight size={17} aria-hidden="true" /></Button></div> : null}
      <p className="trade-chat-advice">Ask about fit, fabric, and any signs of wear. A little detail makes a good find even better.</p>
    </aside><div className="trade-chat-main">
      {openOffer ? <div className="trade-live-offer"><div className="trade-live-offer-top"><span className="trade-eyebrow">{proposer ? 'YOUR OFFER' : 'OFFER RECEIVED'}</span><Badge status="pending" /></div><h2>{money(openOffer.amount)}</h2><p>{proposer ? 'Waiting for their response.' : `${identity(conversation.other)} would like to agree on this price.`} Expires {when(openOffer.expires_at)}.</p><div className="trade-action-row">{proposer ? <Button variant="secondary" disabled={Boolean(busy)} loading={busy === 'withdraw'} onClick={() => respond('withdraw')}>Withdraw offer</Button> : <><Button disabled={Boolean(busy)} loading={busy === 'accept'} onClick={() => respond('accept')}>Accept offer</Button><Button variant="secondary" disabled={Boolean(busy) || openOffer.proposal_number >= 6} onClick={() => beginOffer('counter')}>Counter</Button><Button variant="text" disabled={Boolean(busy)} loading={busy === 'decline'} onClick={() => respond('decline')}>Decline</Button></>}</div>{!proposer ? <p className="trade-offer-rule">Accepting reserves the piece for the buyer to pay within 30 minutes.{openOffer.proposal_number >= 6 ? ' All six proposals have been used.' : ''}</p> : null}</div> : isBuyer && conversation.listing.status === 'active' && conversation.listing.allow_offers ? <div className="trade-offer-invite"><HeartHandshake size={22} aria-hidden="true" /><span>Found your price?</span><Button variant="secondary" onClick={() => beginOffer('new')}>Make an offer</Button></div> : null}
      <div className="trade-messages" ref={messagesElement} role="log" aria-label="Conversation messages" aria-live="polite" onScroll={event => { const el = event.currentTarget; followMessages.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; if(followMessages.current)acknowledge(); }}>
        {conversation.messages.length ? conversation.messages.map(message => message.kind === 'system' ? <div key={message.id} className="trade-system-message"><span>{message.body}</span><time>{when(message.created_at)}</time></div> : <div className={`trade-message ${message.sender_id === s.user.id ? 'trade-message-mine' : ''}`} key={message.id}><span className="trade-message-sender">{message.sender_id === s.user.id ? 'You' : identity(conversation.other)}</span><p>{message.body}</p><time>{when(message.created_at)}</time>{message.sender_id===s.user.id&&<span className="message-receipt">{message.read_by_other?'Read':'Sent'}</span>}</div>) : <div className="trade-chat-welcome"><MessageCircle size={30} strokeWidth={1.5} aria-hidden="true" /><h3>A little hello goes a long way</h3><p>Ask a question about the piece to get started.</p></div>}
      </div><InlineError message={error} /><form className="trade-compose" onSubmit={sendMessage}><textarea aria-label="Your message" rows={2} maxLength={2000} placeholder="Ask about this piece…" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(event); } }} /><Button type="submit" icon={Send} loading={busy === 'message'} disabled={!draft.trim() || Boolean(busy)}>Send</Button></form><p className="trade-compose-hint">Keep payment in checkout. Enter sends; Shift + Enter starts a new line.</p>
      {conversation.offers.length ? <details className="trade-history" open><summary>Offer history <span>{conversation.offers.length}</span></summary>{conversation.offers.slice().reverse().map(offer => <div className="trade-offer-history-row" key={offer.id}><span>{offer.proposer_id === s.user.id ? 'You' : identity(conversation.other)}<small>{offer.previous_offer_id?'Counteroffer':'Opening offer'} · {offer.proposal_number}/6 · {when(offer.created_at)}</small>{offer.reason&&<small className="offer-reason">{offer.reason}</small>}</span><strong>{money(offer.amount)}</strong><Badge status={offer.status} /></div>)}</details> : null}
    </div></div>
    {offerSheet ? <Sheet title={offerSheet === 'counter' ? 'Meet in the middle' : 'Make it your next find'} onClose={() => { if (!busy) setOfferSheet(null); }} description={`Asking price: ${money(conversation.listing.price)}. Offers last 24 hours.`}><form onSubmit={submitOffer}><Field label="Your offer (ETB)" hint={`Between ${money(minimumOffer)} and ${money(conversation.listing.price)}. Whole birr only.`} error={offerError}><input type="number" inputMode="numeric" min={minimumOffer} max={conversation.listing.price} step={1} required value={amount} onChange={event => setAmount(event.target.value)} /></Field><div className="trade-offer-presets">{[.7, .85, 1].map(fraction => { const price = Math.max(minimumOffer, Math.round(conversation.listing.price * fraction)); return <Chip key={fraction} active={Number(amount) === price} onClick={() => setAmount(String(price))}>{money(price)}</Chip>; })}</div><p className="trade-form-note">An accepted offer reserves the piece for 30 minutes. Payment is made at checkout.</p><Button className="trade-full" type="submit" loading={busy === 'offer'} disabled={Boolean(busy)}>{offerSheet === 'counter' ? 'Send counteroffer' : 'Send offer'}<ArrowRight size={17} aria-hidden="true" /></Button></form></Sheet> : null}
  </section>;
}

function OrderTotals({ order, pendingDelivery=false }) {
  return <dl className="trade-totals"><div><dt>Piece</dt><dd>{money(order.amount)}</dd></div><div><dt>Delivery</dt><dd>{pendingDelivery?'Get a delivery quote':money(order.delivery)}</dd></div><div><dt>Marketplace fee</dt><dd>0 ETB</dd></div><div className="trade-total"><dt>Total</dt><dd>{pendingDelivery?`${money(order.amount)} + delivery`:money(order.total)}</dd></div></dl>;
}

export function Checkout({ id }) {
  const s = useStore();
  const resource = useResource(`/orders/${encodeURIComponent(id)}`);
  const order = s.orders.find(item => item.id === id) || resource.value?.order;
  const [address, setAddress] = useState({ name: '', phone: '', street: '', area: '',lat:'',lon:'' });
  const [clock,setClock]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const [quote,setQuote]=useState(null);const quoteValid=quote&&new Date(quote.expires_at).getTime()>clock&&quote.addressKey===JSON.stringify(deliveryAddress(address));
  useEffect(()=>{setQuote(null);},[address]);
  const [outcome, setOutcome] = useState('success');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [checkMessage, setCheckMessage] = useState('');
  const paymentAttempt = useRef(null);
  const prefilled = useRef(null);
  useEffect(() => { if (order && prefilled.current !== order.id) { setAddress({ name: order.address?.name || s.user?.name || '', phone: order.address?.phone || '', street: order.address?.street || '', area: order.address?.area || '',lat:order.address?.lat??'',lon:order.address?.lon??'' }); prefilled.current = order.id; paymentAttempt.current = null; setError(''); setCheckMessage(''); } }, [order?.id, s.user?.name]);
  if (!s.loading && !s.user) return <SignInPrompt />;
  if (!order && (resource.loading || s.loading)) return <section className="page"><LoadingState label="Preparing checkout…" count={2} /></section>;
  if (!order) return <section className="page"><ErrorState message={resource.error || 'This order is unavailable.'} onRetry={resource.reload} /></section>;
  if (order.buyer_id !== s.user.id) return <section className="page trade-narrow"><EmptyState title="The buyer completes checkout" description="You can follow this sale and prepare the piece once payment is confirmed." action="View your sale" onAction={() => s.go('order', id)} icon={Package} /></section>;

  async function pay(event) {
    event.preventDefault();
    if (busy) return;
    setBusy('pay'); setError('');
    if (!paymentAttempt.current) paymentAttempt.current = uuid();
    try { await s.act(`/orders/${id}/pay`, { address:order.delivery_required?deliveryAddress(address):address,delivery_quote_id:quoteValid?quote.id:null, outcome, idempotency_key: paymentAttempt.current }); paymentAttempt.current = null; }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function check() {
    setBusy('check'); setError('');
    try { const result = await s.act(`/orders/${id}/payment-check`); setCheckMessage(result.pending ? 'This test payment is still pending. No second payment is needed.' : 'Payment status refreshed.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function resolve(next) {
    setBusy(next); setError('');
    try { await s.act(`/sandbox/payment/${id}`, { outcome: next }); paymentAttempt.current = null; setCheckMessage(''); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  if (order.payment_status === 'paid') return <section className="page trade-page trade-narrow"><PageHeader title="A good find. Now yours." onBack={() => s.go('inbox')} /><div className="trade-payment-result"><span className="trade-result-icon"><CheckCircle2 size={37} strokeWidth={1.5} aria-hidden="true" /></span><span className="trade-eyebrow">LOCAL TEST PAYMENT</span><h2>Payment confirmed</h2><p>Your seller can now prepare your piece. Follow every step from your order.</p><ItemSummary item={order.item} amount={order.total} onOpen={() => s.go('product', order.listing_id)} /><Button className="trade-full" onClick={() => s.go('order', id)}>Track your order <ArrowRight size={17} aria-hidden="true" /></Button></div><TestNote>No real money was charged. This confirmed test payment and order are saved in the local database.</TestNote></section>;
  if (order.state === 'cancelled') return <section className="page trade-page trade-narrow"><PageHeader title="This reservation has ended" onBack={() => s.go('inbox')} /><EmptyState title="Checkout is closed" description={order.payment_status === 'refunded_test' ? 'This order was cancelled and a test refund was recorded.' : 'The reservation was cancelled or its payment window expired.'} action="View order" onAction={() => s.go('order', id)} icon={Clock3} /></section>;
  if (order.payment_status === 'pending') return <section className="page trade-page trade-narrow"><PageHeader title="We’re checking your payment" onBack={() => s.go('order', id)} /><div className="trade-payment-result"><span className="trade-result-icon trade-result-icon-pending"><Clock3 size={36} strokeWidth={1.5} aria-hidden="true" /></span><h2>Payment pending</h2><p>Your piece stays reserved while this test payment is pending. Please do not start another payment.</p><ItemSummary item={order.item} amount={order.total} onOpen={() => s.go('product', order.listing_id)} /><InlineError message={error} />{checkMessage ? <p role="status" className="trade-form-note">{checkMessage}</p> : null}<Button className="trade-full" variant="secondary" loading={busy === 'check'} disabled={Boolean(busy)} onClick={check}>Check payment status</Button></div><details className="trade-test-tools"><summary>Test tools <Badge>LOCAL ONLY</Badge></summary><p>Simulate the payment provider’s final response. This controls test data only.</p><div className="trade-action-row"><Button disabled={Boolean(busy)} loading={busy === 'success'} onClick={() => resolve('success')}>Confirm test success</Button><Button variant="secondary" disabled={Boolean(busy)} loading={busy === 'failure'} onClick={() => resolve('failure')}>Confirm test failure</Button></div></details><TestNote /></section>;

  return <section className="page trade-page"><PageHeader title="One step closer." description="Confirm your delivery details, then give this piece its next chapter." onBack={() => s.go('order', id)} /><TestNote />
    <form className="trade-checkout-grid" onSubmit={pay}><div className="trade-checkout-form">{order.payment_status === 'failed' ? <div className="trade-payment-failed" role="alert"><XCircle size={25} aria-hidden="true" /><div><h3>That test payment didn’t go through</h3><p>No charge was made. Review your details and try again while your reservation is active.</p></div></div> : null}<h2>Where should it go?</h2><AddressPicker address={address} setAddress={setAddress} order={order}/><Field label="Recipient name" required><input autoComplete="name" value={address.name} maxLength={80} onChange={event => setAddress({ ...address, name: event.target.value })} /></Field><Field label="Phone number" required hint="For delivery updates. Example: +251 91 234 5678."><input type="tel" autoComplete="tel" inputMode="tel" minLength={9} maxLength={20} pattern="[+0-9 ()\-]{9,20}" value={address.phone} onChange={event => setAddress({ ...address, phone: event.target.value })} /></Field><Field label="Street address or landmark" required><input autoComplete="street-address" minLength={3} maxLength={200} value={address.street} onChange={event => setAddress({ ...address, street: event.target.value })} /></Field><Field label="Area in Addis Ababa" required hint="The pilot delivery area is Addis Ababa."><input autoComplete="address-level3" minLength={2} maxLength={60} placeholder="e.g. Bole" value={address.area} onChange={event => setAddress({ ...address, area: event.target.value })} /></Field><div className="trade-delivery-note"><Truck size={23} aria-hidden="true" /><div><strong>Delivery to your door</strong><p>{order.delivery_required?'Local test quote · reviewed before payment':'150 ETB · legacy test order'}</p></div></div>{order.delivery_required&&<DeliveryQuote order={order} address={address} setAddress={setAddress} quote={quote} setQuote={setQuote}/>}<details className="trade-test-tools" open><summary>Test payment setup <Badge>LOCAL ONLY</Badge></summary><p>Choose a payment result to test the complete marketplace flow. No provider or payment account is connected.</p><Field label="Simulated payment outcome"><select value={outcome} onChange={event => { setOutcome(event.target.value); paymentAttempt.current = null; }}><option value="success">Successful payment</option><option value="failure">Declined payment</option><option value="pending">Pending provider confirmation</option></select></Field></details></div><aside className="trade-checkout-summary"><span className="trade-eyebrow">YOUR NEXT FIND</span><ItemSummary item={order.item} onOpen={() => s.go('product', order.listing_id)} /><p className="trade-reservation"><Clock3 size={16} aria-hidden="true" />Reserved until {when(order.reserved_until)}</p><OrderTotals order={order} pendingDelivery={order.delivery_required&&!quoteValid}/>{order.delivery_required&&!quoteValid&&<p className="quote-expired" role="status">{quote?'Your delivery quote expired. Refresh it to review the total before paying.':'Choose your delivery details and get a quote to see the full total.'}</p>}<InlineError message={error} /><Button type="submit" className="trade-full" icon={CreditCard} loading={busy === 'pay'} disabled={Boolean(busy)||order.safety_hold||(order.delivery_required&&!quoteValid)}>Confirm test payment</Button><p className="trade-form-note">{money(order.total)} in test mode. No real charge.</p></aside></form>
  </section>;
}

export function OrderDetail({ id }) {
  const s = useStore();
  const resource = useResource(`/orders/${encodeURIComponent(id)}`);
  const order = s.orders.find(item => item.id === id) || resource.value?.order;
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [cancelSheet, setCancelSheet] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  useEffect(() => { setError(''); setCancelSheet(false); setRating(0); setComment(''); }, [id]);
  if (!s.loading && !s.user) return <SignInPrompt />;
  if (!order && (resource.loading || s.loading)) return <section className="page"><LoadingState label="Finding your order…" count={2} /></section>;
  if (!order) return <section className="page"><ErrorState message={resource.error || 'This order is unavailable.'} onRetry={resource.reload} /></section>;
  const buyer = order.buyer_id === s.user.id;
  const canCancel = (!order.fulfillment||order.fulfillment.status==='cancelled') && order.payment_status !== 'pending' && (buyer ? ['awaiting_payment', 'paid', 'preparing'] : ['awaiting_payment', 'paid', 'preparing', 'ready']).includes(order.state);
  const conversation = s.conversations.find(item => item.listing_id === order.listing_id && item.buyer_id === order.buyer_id);
  const progress = ['paid', 'preparing', 'ready', 'in_transit', 'delivered', 'completed'];
  const step = progress.indexOf(order.state);

  async function orderAction(action) {
    if (busy) return;
    setBusy(action); setError('');
    try { await s.act(`/orders/${id}/action`, { action }, action === 'confirm' ? 'Receipt confirmed. Thank you for giving this piece another life.' : action === 'cancel' ? 'Order cancelled.' : action === 'ready' ? 'Your piece is marked ready for pickup.' : 'Your buyer knows you are preparing the piece.'); setCancelSheet(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function delivery(event) {
    setBusy(event); setError('');
    try { await s.act(`/sandbox/delivery/${id}`, { event }, event === 'picked_up' ? 'Test courier pickup recorded.' : 'Test courier delivery recorded.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function review(event) {
    event.preventDefault();
    if (!rating || busy) return;
    setBusy('review'); setError('');
    try { await s.act(`/orders/${id}/review`, { rating, comment }, 'Your review is saved.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function message() {
    if (conversation) { s.go('chat', conversation.id); return; }
    if (!buyer) return;
    setBusy('message'); setError('');
    try { const result = await s.act('/conversations', { listing_id: order.listing_id }); s.go('chat', result.conversation.id); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  return <section className="page trade-page"><PageHeader eyebrow={buyer ? 'YOUR NEXT CHAPTER' : 'FROM YOUR CLOSET'} title={stageNames[order.state] || 'Your order'} description={`${buyer ? 'Bought from' : 'Sold to'} ${identity(buyer ? order.seller : order.buyer)} · Order ${id.slice(0, 8).toUpperCase()}`} onBack={() => s.go('inbox')}><Badge status={order.state}>{stageNames[order.state]}</Badge></PageHeader><div className="trade-order-grid"><div className="trade-order-main"><ItemSummary item={order.item} amount={order.amount} onOpen={() => s.go('product', order.listing_id)} />
      {order.state !== 'cancelled' ? <ol className="trade-progress" aria-label="Order progress">{progress.map((state, index) => <li className={index <= step ? 'trade-progress-done' : ''} key={state} aria-current={state === order.state ? 'step' : undefined}><span>{index < step ? <Check size={15} aria-hidden="true" /> : index + 1}</span><small>{stageNames[state]}</small></li>)}</ol> : null}
      <InlineError message={error} />{order.safety_hold&&<div className="safety-hold"><strong>This order is held for safety review.</strong><p>New dispatch and completion are paused. A courier already on the way needs a separate cancellation or support review. You can submit an appeal or report a problem.</p><ReportButton id={id} label="Open safety support"/></div>}
      <div className="trade-next-step">
        {order.state === 'awaiting_payment' ? <><Clock3 size={27} strokeWidth={1.5} aria-hidden="true" /><div><h2>{order.payment_status === 'pending' ? 'Payment is being checked' : buyer ? 'Your piece is reserved' : 'Waiting for the buyer'}</h2><p>{order.payment_status === 'pending' ? 'This test payment remains pending. The piece stays reserved until its outcome is resolved.' : buyer ? `Complete your test payment by ${when(order.reserved_until)} to keep this piece.` : `The buyer has until ${when(order.reserved_until)} to complete payment. Prepare the piece after payment is confirmed.`}</p>{buyer ? <Button onClick={() => s.go('checkout', id)}>{order.payment_status === 'pending' ? 'Check payment' : 'Continue to checkout'}<ArrowRight size={17} aria-hidden="true" /></Button> : null}</div></> : null}
        {order.state === 'paid' || order.state === 'preparing' ? <><Package size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2>{buyer ? 'A little preparation, then a new beginning' : 'Give your piece a lovely send-off'}</h2><p>{buyer ? 'Your seller will check and package the piece, then mark it ready for pickup.' : 'Check the condition against your listing, fold the piece, and package it securely.'}</p>{!buyer ? <div className="trade-action-row">{order.state === 'paid' ? <Button variant="secondary" loading={busy === 'prepare'} disabled={Boolean(busy)||order.safety_hold} onClick={() => orderAction('prepare')}>Start preparing</Button> : null}<Button loading={busy === 'ready'} disabled={Boolean(busy)||order.safety_hold||(order.pickup_confirmation_required&&!order.pickup_confirmed)} onClick={() => orderAction('ready')}>Mark ready for pickup</Button></div> : null}</div></> : null}
        {order.state === 'ready' ? <><Truck size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2>Ready for its next home</h2><p>The seller has marked this piece ready. The next step is courier pickup.</p></div></> : null}
        {order.state === 'in_transit' ? <><Truck size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2>Your piece is on the way</h2><p>Test courier pickup has been recorded. Delivery confirmation is the next step.</p></div></> : null}
        {order.state === 'delivered' ? <><CheckCircle2 size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2>{buyer ? 'Have a good look at your find' : 'Your piece has reached its next home'}</h2><p>{buyer ? 'Check that the piece arrived as described. Confirm receipt when you are happy with it.' : 'Delivery has been recorded. The buyer can now check the piece and confirm receipt.'}</p>{buyer ? <Button loading={busy === 'confirm'} disabled={Boolean(busy)||order.safety_hold} onClick={() => orderAction('confirm')}>Confirm I received it</Button> : null}</div></> : null}
        {order.state === 'completed' ? <><HeartHandshake size={30} strokeWidth={1.5} aria-hidden="true" /><div><h2>A piece with a new story</h2><p>{buyer ? 'Receipt confirmed. Thank you for choosing another life for this piece.' : 'The buyer has confirmed receipt. Your completed sale is saved here.'}</p></div></> : null}
        {order.state === 'cancelled' ? <><XCircle size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2>This order is closed</h2><p>{order.payment_status === 'refunded_test' ? 'A test refund has been recorded. No real money was charged or returned.' : 'The reservation ended without a completed payment.'}</p><Button variant="secondary" onClick={() => s.go('explore')}>Discover more pieces</Button></div></> : null}
      </div>
      {!buyer&&<PickupConfirmation order={order}/>}<DeliveryStatus order={order}/><Button variant="text" onClick={()=>s.go('problem',id)}>{order.issue?'View problem report · '+order.issue.status.replaceAll('_',' '):'Report an order problem'}</Button><div className="trade-timeline"><h2>The journey so far</h2><ol>{order.events?.map((event, index) => <li key={`${event.at}-${index}`}><span className="trade-event-dot" /><div><strong>{event.label}</strong><time>{when(event.at)}</time>{event.source?.startsWith('test') || event.source === 'sandbox_courier' ? <span className="trade-event-source">Local test event</span> : null}</div></li>)}</ol></div>
      {order.payment_status === 'paid' && ['ready', 'in_transit'].includes(order.state) ? <details className="trade-test-tools"><summary>Test tools <Badge>LOCAL ONLY</Badge></summary><p>Advance the simulated courier. These controls record test delivery evidence; no courier is contacted.</p>{order.state === 'ready' ? <Button variant="secondary" icon={Truck} loading={busy === 'picked_up'} disabled={Boolean(busy)||order.safety_hold||(order.delivery_required&&!['booked','assigned'].includes(order.fulfillment?.status))} onClick={() => delivery('picked_up')}>Simulate courier pickup</Button> : <Button variant="secondary" icon={Package} loading={busy === 'delivered'} disabled={Boolean(busy)||order.safety_hold} onClick={() => delivery('delivered')}>Simulate delivery</Button>}</details> : null}
      {order.review ? <div className="trade-review-saved"><span className="trade-eyebrow">{buyer ? 'YOUR REVIEW' : 'BUYER REVIEW'}</span><div className="trade-review-stars" aria-label={`${order.review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(value => <Star size={21} key={value} fill={value <= order.review.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</div>{order.review.comment ? <p>{order.review.comment}</p> : <p>Thank you for sharing your experience.</p>}</div> : buyer && order.state === 'completed' ? <form className="trade-review-form" onSubmit={review}><h2>How was your find?</h2><p>Your honest review helps the next buyer.</p><fieldset className="trade-rating"><legend>Your rating</legend>{[1, 2, 3, 4, 5].map(value => <label key={value} className={value <= rating ? 'trade-rating-selected' : ''}><input type="radio" name="order-rating" value={value} checked={rating === value} onChange={() => setRating(value)} required /><span className="trade-sr-only">{value} {value === 1 ? 'star' : 'stars'}</span><Star size={27} fill={value <= rating ? 'currentColor' : 'none'} strokeWidth={1.5} aria-hidden="true" /></label>)}</fieldset><Field label="Tell us about the piece and your experience" hint="Optional · up to 1,000 characters"><textarea rows={3} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} placeholder="Was the piece as described? How was the handover?" /></Field><Button type="submit" disabled={!rating || Boolean(busy)} loading={busy === 'review'}>Publish review</Button></form> : null}
    </div><aside className="trade-order-side"><div className="trade-order-summary"><h2>Order details</h2><OrderTotals order={order} /><div className="trade-payment-state"><span>Test payment</span><Badge status={order.payment_status}>{order.payment_status === 'refunded_test' ? 'Test refund recorded' : order.payment_status === 'unpaid' ? 'Not paid' : undefined}</Badge></div>{buyer && order.address ? <div className="trade-address"><h3>Delivery address</h3><p>{order.address.name}<br />{order.address.street}<br />{order.address.area}, Addis Ababa<br />{order.address.phone}</p></div> : null}<div className="trade-order-person"><span>{buyer ? 'Seller' : 'Buyer'}</span><button type="button" onClick={() => s.go('closet', (buyer ? order.seller : order.buyer).id)}>{identity(buyer ? order.seller : order.buyer)}<ChevronRight size={17} aria-hidden="true" /></button></div>{buyer || conversation ? <Button className="trade-full" variant="secondary" icon={MessageCircle} loading={busy === 'message'} disabled={Boolean(busy)} onClick={message}>{buyer ? 'Message seller' : 'Message buyer'}</Button> : null}</div>
      {!buyer ? <div className="trade-payout"><h3>Payout status</h3><Badge status={order.payout_status === 'holding' ? 'held' : order.payout_status}>{order.payout_status === 'pending_completion' ? 'Awaiting completion' : order.payout_status === 'not_due' ? 'Not due' : undefined}</Badge><p>{order.payout_status === 'holding' ? `Held in the test ledger. The 48-hour delivery window ends ${when(order.eligible_at)}. No automatic payout or real transfer is connected.` : order.payout_status === 'pending_completion' ? 'The test payment is recorded. Payout remains unavailable until delivery, completion, and the holding period.' : order.payout_status==='disputed'?'Payout is paused while the order problem is reviewed.': 'There is no seller payout due for this order.'}</p></div> : null}
      {canCancel ? <Button variant="text" className="trade-cancel-link" onClick={() => buyer?s.go('problem',id):setCancelSheet(true)}>{buyer?'Request cancellation':'Cancel sale'}</Button> : null}<TestNote />
    </aside></div>{cancelSheet ? <Sheet title={buyer ? 'Cancel this order?' : 'Cancel this sale?'} onClose={() => { if (!busy) setCancelSheet(false); }} description={order.payment_status === 'paid' ? 'The order will close and a test refund will be recorded. The sold listing will be archived.' : 'Your reservation will end and the piece will become available again.'} actions={<><Button variant="secondary" disabled={Boolean(busy)} onClick={() => setCancelSheet(false)}>Keep order</Button><Button variant="danger" loading={busy === 'cancel'} disabled={Boolean(busy)} onClick={() => orderAction('cancel')}>Confirm cancellation</Button></>}><InlineError message={error} /></Sheet> : null}
  </section>;
}
