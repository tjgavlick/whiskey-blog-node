const Twig = require('twig');

/*
 * helper functions to aid in the display of information in Twig templates
 */


// helper function: remove null or undefined values from arrays
function clean(arr) {
  return arr.filter(value => value !== null && value !== undefined);
}


/*
 * displayProof: returns a formatted proof or proof range
 */

Twig.extendFunction('displayProof', function (...proofs) {
  proofs = clean(proofs);

  if (proofs.length === 1 || proofs[0] === proofs[1]) {
    return proofs[0] + '°';
  } else {
    return proofs.join(' – ') + '°';
  }
});


/*
 * displayAge: returns a formatted age or age range
 */

Twig.extendFunction('displayAge', function (...ages) {
  ages = clean(ages);

  function formatAge(age) {
    if (age === 1) {
      return '1 year';
    } else if (age > 0 && age < 1) {
      return Math.round(age * 12) + ' months';
    }
    return age + ' years';
  }

  if (ages.length === 1 || ages[0] === ages[1]) {
    return formatAge(ages[0]);
  } else {
    if (ages.every(age => age >= 1)) {
      return ages.join(' – ') + ' years';
    } else {
      return ages.map(age => formatAge(age)).join(' – ');
    }
  }
});


/*
 * displayPrice: returns a formatted price or price range
 */

Twig.extendFunction('displayPrice', function (...prices) {
  prices = clean(prices);

  function formatPrice(price) {
    if (price % 1 === 0) {
      return price.toFixed(0);
    } else {
      return price.toFixed(2);
    }
  }

  if (prices.length === 1 || prices[0] === prices[1]) {
    return '$' + formatPrice(prices[0]);
  } else {
    return '$' + prices.map(price => formatPrice(price)).join(' – ');
  }
});
