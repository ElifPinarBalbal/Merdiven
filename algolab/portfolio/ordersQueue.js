// Priority sorting for orders

// we assign a unique id for orders
let nextId = 1;

/** 
 * Normalize the orders.
 * - Assign the unique id to them
 * - Add default values for refCode, tryCount and date
*/

function normalizeOrders(orders){
    return orders.map(order => ({
        symbol: order.symbol,
        operation: order.operation,
        quantity: order.quantity,
        price: order.price,
        priority: order.priority,
        id: order.id ?? nextId++,
        refCode: order.refCode ?? "0",
        tryCount: order.tryCount ?? 0,
        date: order.date ?? new Date().toISOString()
    }));
}

/**
 * Comparator: volume > 200 wins, else priority
 */

function orderComparator(a, b){
    const volumeA = a.quantity * a.price;
    const volumeB = b.quantity * b.price;

    if (Math.abs(volumeA - volumeB) > 200) {
        return volumeB - volumeA;
    }
    return b.priority - a.priority;
}

/**
 * Get top-priority order
 */
function getTopOrder(orders) {
    const norm = normalizeOrders(orders);  // first normalize them
    return norm.sort(orderComparator)[0] ?? null;   // sort them with comparator and return the first element
}  

/**
 * Get the sorted queue
 */
function getSortedOrders(orders) {
    return normalizeOrders(orders).sort(orderComparator);
}

/**
 * Print sorted list
 */
function printSortedOrders(orders) {
    const sorted = getSortedOrders(orders);
    console.log('\n📊 Sorted Orders:');
    sorted.forEach((o, i) => {
        console.log(`${i + 1}. ID: ${o.id} | ${o.symbol} | ${o.operation} | Qty: ${o.quantity} | Price: ${o.price} | Prio: ${o.priority} | Volume: ${o.quantity * o.price} | Ref Code: ${o.refCode} | Try Count: ${o.tryCount} | Date: ${o.date}`);
    });
}

export {
    normalizeOrders,
    getTopOrder,
    getSortedOrders,
    printSortedOrders
};
