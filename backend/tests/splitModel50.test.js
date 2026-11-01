const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFeeShare } = require('../src/utils/feeCalculator');
const { SPLIT_DOCTOR_PERCENTAGE, isWebsiteDirectDoctor, assertSplitTerms, normalizeRevenueConfiguration } = require('../src/utils/splitModel');
const Doctor = require('../src/models/Doctor.model');

test('only independently website-registered doctors have an immutable 50:50 agreement', () => {
  assert.equal(SPLIT_DOCTOR_PERCENTAGE, 50);
  assert.equal(isWebsiteDirectDoctor({registrationSource:'website_direct'}),true);
  for(const source of [undefined,'agent','admin']) assert.equal(isWebsiteDirectDoctor({registrationSource:source}),false);
  assert.doesNotThrow(()=>assertSplitTerms({requestedFeeShareType:'percentage',requestedFeeSharePercentage:50}));
  for(const terms of [
    {feeSharePercentage:65}, {requestedFeeSharePercentage:40},
    {feeShareType:'fixed'}, {fixedFeeShareAmount:300},
    {feeShareCalculationBasis:'net_after_charges'},
    {feeShareSlabs:[{minPatients:1,percentage:80}]},
  ]) assert.throws(()=>assertSplitTerms(terms),{status:400});
});

test('website-direct doctor is normalized on schema validation but Agent and legacy split settings are preserved', async()=>{
  const website = new Doctor({fullName:'Independent Doctor',mobile:'9999999999',
    registrationSource:'website_direct',revenueModel:'split',feeShareType:'fixed',
    fixedFeeShareAmount:350,feeSharePercentage:90,feeShareCalculationBasis:'after_discount'});
  await website.validate();
  assert.equal(website.feeShareType,'percentage');
  assert.equal(website.feeSharePercentage,50);
  assert.equal(website.requestedFeeSharePercentage,50);
  assert.equal(website.feeShareCalculationBasis,'gross');
  const agent = new Doctor({fullName:'Agent Doctor',mobile:'9999999998',
    registrationSource:'agent',revenueModel:'split',feeShareType:'fixed',
    fixedFeeShareAmount:350,feeShareCalculationBasis:'net_after_charges'});
  await agent.validate();
  assert.equal(agent.feeShareType,'fixed');
  assert.equal(agent.fixedFeeShareAmount,350);
  assert.equal(agent.feeShareCalculationBasis,'net_after_charges');
  const legacy = new Doctor({fullName:'Legacy Doctor',mobile:'9999999997',
    revenueModel:'split',feeShareType:'slab',feeShareSlabs:[{minPatients:1,maxPatients:10,percentage:70}]});
  await legacy.validate();
  assert.equal(legacy.feeShareType,'slab');
  assert.equal(legacy.feeShareSlabs.length,1);
});

test('legacy percentage, fixed and slab calculations work again',()=>{
  assert.deepEqual(calculateFeeShare({paidAmount:2000,feeShareType:'percentage',percentage:60}),
    {doctorShare:1200,platformShare:800,eligibleAmount:2000});
  assert.deepEqual(calculateFeeShare({paidAmount:2000,feeShareType:'fixed',fixedAmount:350}),
    {doctorShare:350,platformShare:1650,eligibleAmount:2000});
  const slab=calculateFeeShare({paidAmount:2000,feeShareType:'slab',
    slabs:[{minPatients:1,maxPatients:10,percentage:70}],totalPaidPatients:4});
  assert.equal(slab.doctorShare,1400);
  assert.equal(slab.platformShare,600);
  assert.equal(slab.appliedPercentage,70);
});

test('fee-share calculation basis and Platform Fee are preserved',()=>{
  const net=calculateFeeShare({paidAmount:2000,gatewayCharges:100,percentage:50,basis:'net_after_charges'});
  assert.deepEqual(net,{doctorShare:950,platformShare:950,eligibleAmount:1900});
  assert.deepEqual(calculateFeeShare({paidAmount:2000,revenueModel:'platform_fee',percentage:50}),
    {doctorShare:0,platformShare:2000,eligibleAmount:2000});
});

test('a website-direct doctor is always normalized to split 50:50 even if commercial fields are manipulated',()=>{
  const cfg=normalizeRevenueConfiguration({registrationSource:'website_direct',revenueModel:'platform_fee',feeShareType:'slab',feeSharePercentage:75});
  assert.equal(cfg.revenueModel,'split');
  assert.equal(cfg.feeSharePercentage,50);
  assert.equal(cfg.feeShareType,'percentage');
});
