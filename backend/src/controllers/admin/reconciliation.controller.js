const { Order, Payment } = require('../../models/Payment.model');
const Refund = require('../../models/Refund.model');
const { FeeShare, WithdrawalRequest } = require('../../models/FeeShare.model');
const { DoctorWallet } = require('../../models/Wallet.model');
const Payout = require('../../models/Payout.model');
const asyncHandler = require('../../utils/asyncHandler');

const getReconciliation = asyncHandler(async (req,res)=>{
  const [successfulOrders,verifiedPayments,refunds,feeShares,wallets,withdrawals,payouts] = await Promise.all([
    Order.find({status:{$in:['successful','manually_verified','refunded','partially_refunded']}}).select('_id orderId finalAmount status').lean(),
    Payment.find({status:{$in:['successful','manually_verified','refunded','partially_refunded']}}).select('_id order paidAmount refundAmount doctorFeeShare platformShare status invoiceNumber doctor').lean(),
    Refund.find({}).select('_id payment refundAmount feeShareReversal status').lean(),
    FeeShare.find({}).select('_id payment doctor amount status').lean(),
    DoctorWallet.find({}).select('_id doctor pendingBalance availableBalance withdrawalRequestedAmount paidBalance reversedBalance lifetimeEarnings').lean(),
    WithdrawalRequest.find({}).select('_id doctor wallet requestedAmount status').lean(),
    Payout.find({}).select('_id withdrawalRequest doctor amount status').lean(),
  ]);

  const paymentByOrder=new Map(verifiedPayments.map(p=>[String(p.order),p]));
  const paymentById=new Map(verifiedPayments.map(p=>[String(p._id),p]));
  const feeByPayment=new Map(feeShares.map(f=>[String(f.payment),f]));
  const refundByPayment=new Map(); refunds.forEach(r=>{const k=String(r.payment);refundByPayment.set(k,(refundByPayment.get(k)||0)+(r.status==='completed'?(r.refundAmount||0):0));});
  const payoutByWithdrawal=new Map(payouts.map(p=>[String(p.withdrawalRequest),p]));
  const walletByDoctor=new Map(wallets.map(w=>[String(w.doctor),w]));
  const issues=[];

  successfulOrders.forEach(o=>{if(!paymentByOrder.has(String(o._id)))issues.push({type:'order_without_payment',severity:'critical',reference:o.orderId||String(o._id),message:'Successful/refunded order has no verified payment record.'});});
  verifiedPayments.forEach(p=>{const order=successfulOrders.find(o=>String(o._id)===String(p.order));if(order&&Math.abs((order.finalAmount||0)-(p.paidAmount||0))>0.01)issues.push({type:'order_payment_amount_mismatch',severity:'high',reference:p.invoiceNumber||String(p._id),message:'Order final amount and payment paid amount differ.',expected:order.finalAmount,actual:p.paidAmount});const fee=feeByPayment.get(String(p._id));if((p.doctorFeeShare||0)>0&&!fee)issues.push({type:'payment_without_fee_share',severity:'high',reference:p.invoiceNumber||String(p._id),message:'Verified payment has doctor fee share amount but no FeeShare ledger record.'});const refunded=refundByPayment.get(String(p._id))||0;if(Math.abs(refunded-(p.refundAmount||0))>0.01)issues.push({type:'refund_amount_mismatch',severity:'high',reference:p.invoiceNumber||String(p._id),message:'Completed refund total differs from Payment.refundAmount.',expected:p.refundAmount||0,actual:refunded});});
  withdrawals.forEach(w=>{const wallet=walletByDoctor.get(String(w.doctor));if(!wallet)issues.push({type:'withdrawal_without_wallet',severity:'critical',reference:String(w._id),message:'Withdrawal request has no doctor wallet.'});const payout=payoutByWithdrawal.get(String(w._id));if(['processing','paid'].includes(w.status)&&!payout)issues.push({type:'withdrawal_without_payout',severity:'critical',reference:String(w._id),message:'Processing/paid withdrawal has no payout record.'});if(payout&&Math.abs((payout.amount||0)-(w.requestedAmount||0))>0.01)issues.push({type:'withdrawal_payout_amount_mismatch',severity:'high',reference:String(w._id),message:'Withdrawal requested amount and payout amount differ.',expected:w.requestedAmount,actual:payout.amount});});
  payouts.forEach(p=>{const w=withdrawals.find(x=>String(x._id)===String(p.withdrawalRequest));if(!w)issues.push({type:'orphan_payout',severity:'critical',reference:String(p._id),message:'Payout has no matching withdrawal request.'});});

  const totals={orders:successfulOrders.reduce((s,x)=>s+(x.finalAmount||0),0),payments:verifiedPayments.reduce((s,x)=>s+(x.paidAmount||0),0),refunds:refunds.filter(x=>x.status==='completed').reduce((s,x)=>s+(x.refundAmount||0),0),feeShares:feeShares.reduce((s,x)=>s+(x.amount||0),0),payouts:payouts.filter(x=>x.status==='completed').reduce((s,x)=>s+(x.amount||0),0)};
  res.json({summary:{issues:issues.length,critical:issues.filter(x=>x.severity==='critical').length,high:issues.filter(x=>x.severity==='high').length,orders:successfulOrders.length,payments:verifiedPayments.length,refunds:refunds.length,feeShares:feeShares.length,withdrawals:withdrawals.length,payouts:payouts.length},totals,issues});
});
module.exports={getReconciliation};