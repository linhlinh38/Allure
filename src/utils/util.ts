const nextShippingStatusMap = {};
nextShippingStatusMap['TO_PAY'] = 'WAIT_FOR_CONFIRMATION';
nextShippingStatusMap['WAIT_FOR_CONFIRMATION'] = 'PREPARING_ORDER';
nextShippingStatusMap['PREPARING_ORDER'] = 'TO_SHIP';
nextShippingStatusMap['TO_SHIP'] = 'SHIPPING';
nextShippingStatusMap['SHIPPING'] = 'DELIVERED';
nextShippingStatusMap['DELIVERED'] = 'COMPLETED';

export default nextShippingStatusMap;