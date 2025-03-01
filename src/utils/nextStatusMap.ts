const nextShippingStatusMap = {};
nextShippingStatusMap['TO_PAY'] = 'WAIT_FOR_CONFIRMATION';
nextShippingStatusMap['WAIT_FOR_CONFIRMATION'] = 'PREPARING_ORDER';
nextShippingStatusMap['PREPARING_ORDER'] = 'TO_SHIP';
nextShippingStatusMap['TO_SHIP'] = 'SHIPPING';
nextShippingStatusMap['SHIPPING'] = 'DELIVERED';
nextShippingStatusMap['DELIVERED'] = 'COMPLETED';

const nextBrandStatusMap = {};
nextBrandStatusMap['PENDING_REVIEW'] = [
  'NEED_ADDITIONAL_DOCUMENTS',
  'PRE_APPROVED_FOR_MEETING',
  'DENIED',
];
nextBrandStatusMap['NEED_ADDITIONAL_DOCUMENTS'] = [
  'PRE_APPROVED_FOR_MEETING',
  'DENIED',
];
nextBrandStatusMap['PRE_APPROVED_FOR_MEETING'] = ['DONE_MEETING'];
nextBrandStatusMap['DONE_MEETING'] = ['DENIED', 'ACTIVE'];
nextBrandStatusMap['ACTIVE'] = ['INACTIVE', 'BANNED'];

export { nextShippingStatusMap, nextBrandStatusMap };
