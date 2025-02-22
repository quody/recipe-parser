"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prettyPrintingPress = exports.combine = exports.multiLineParse = exports.parse = exports.toTasteRecognize = void 0;
var convert = require("./convert");
var units_1 = require("./units");
var repeatingFractions_1 = require("./repeatingFractions");
var numbers_1 = require("./numbers");
function toTasteRecognize(input, language) {
    var toTaste = numbers_1.toTasteMap[language];
    var firstLetter = toTaste.match(/\b(\w)/g);
    //componing first two word
    //const word = firstWord.concat(' ').concat(secondWord)
    if (firstLetter) {
        //checking the extended version
        var regEx = new RegExp(toTaste, 'gi');
        if (input.match(regEx)) {
            return [(firstLetter.join('.') + '.').toLocaleLowerCase(), convert.getFirstMatch(input, regEx), true];
        }
        var regExString = firstLetter.join('[.]?') + '[.]?';
        regEx = new RegExp(regExString, 'gi');
        //const a = input.toString().split(/[\s-]+/);
        if (input.match(regEx)) {
            return [(firstLetter.join('.') + '.').toLocaleLowerCase(), convert.getFirstMatch(input, regEx), false];
        }
    }
    return ['', '', false];
}
exports.toTasteRecognize = toTasteRecognize;
function getUnit(input, language) {
    // const word = input.concat(' ').concat(secondWord)
    var unit = units_1.unitsMap.get(language);
    var units = unit[0];
    var pluralUnits = unit[1];
    var symbolUnits = unit[3];
    var response = [];
    var _a = toTasteRecognize(input, language), toTaste = _a[0], match = _a[1], extFlag = _a[2];
    if (toTaste) {
        if (extFlag) {
            response = [toTaste, toTaste, match];
        }
        else {
            response = [toTaste, toTaste, match];
        }
    }
    else {
        if (units[input] || pluralUnits[input]) {
            response = [input, pluralUnits[input], input];
        }
        for (var _i = 0, _b = Object.keys(units); _i < _b.length; _i++) {
            var unit_1 = _b[_i];
            for (var _c = 0, _d = units[unit_1]; _c < _d.length; _c++) {
                var shorthand = _d[_c];
                var regex = new RegExp('(?=\\b' + shorthand + '\\b)', 'gi');
                if (input.match(regex)) {
                    response = [unit_1, pluralUnits[unit_1], shorthand];
                }
            }
        }
        for (var _e = 0, _f = Object.keys(pluralUnits); _e < _f.length; _e++) {
            var pluralUnit = _f[_e];
            var regex = new RegExp('(?=\\b' + pluralUnits[pluralUnit] + '\\b)', 'gi');
            if (input.match(regex)) {
                response = [pluralUnit, pluralUnits[pluralUnit], pluralUnits[pluralUnit]];
            }
        }
    }
    var symbol = symbolUnits[response[0]];
    response.splice(2, 0, symbol);
    return response;
}
/* return the proposition if it's used before of the name of
the ingredient */
function getPreposition(input, language) {
    var prepositionMap = units_1.unitsMap.get(language);
    var prepositions = prepositionMap[2];
    for (var _i = 0, prepositions_1 = prepositions; _i < prepositions_1.length; _i++) {
        var preposition = prepositions_1[_i];
        var regex = new RegExp('^' + preposition);
        if (convert.getFirstMatch(input, regex))
            return preposition;
    }
    return null;
}
function parse(recipeString, language) {
    var _a;
    var ingredientLine = recipeString.trim().replace(/^(-)/, ""); // removes leading and trailing whitespace
    /* restOfIngredient represents rest of ingredient line.
    For example: "1 pinch salt" --> quantity: 1, restOfIngredient: pinch salt */
    var _b = convert.findQuantityAndConvertIfUnicode(ingredientLine, language), quantity = _b[0], restOfIngredient = _b[1];
    quantity = convert.convertFromFraction(quantity);
    /* extraInfo will be any info in parantheses. We'll place it at the end of the ingredient.
    For example: "sugar (or other sweetener)" --> extraInfo: "(or other sweetener)" */
    var extraInfo;
    if (convert.getFirstMatch(restOfIngredient, /\(([^\)]+)\)/)) {
        extraInfo = convert.getFirstMatch(restOfIngredient, /\(([^\)]+)\)/);
        restOfIngredient = restOfIngredient.replace(extraInfo, '').trim();
    }
    // grab unit and turn it into non-plural version, for ex: "Tablespoons" OR "Tsbp." --> "tablespoon"
    var _c = getUnit(restOfIngredient, language), unit = _c[0], unitPlural = _c[1], symbol = _c[2], originalUnit = _c[3];
    // remove unit from the ingredient if one was found and trim leading and trailing whitespace
    var ingredient = !!originalUnit ? restOfIngredient.replace(originalUnit, '').trim() : restOfIngredient.replace(unit, '').trim();
    ingredient = ingredient.split('.').join("").trim();
    var preposition = getPreposition(ingredient.split(' ')[0], language);
    if (preposition) {
        var regex = new RegExp('^' + preposition);
        ingredient = ingredient.replace(regex, '').trim();
    }
    var minQty = quantity; // default to quantity
    var maxQty = quantity; // default to quantity
    // if quantity is non-nil and is a range, for ex: "1-2", we want to get minQty and maxQty
    if (quantity && quantity.includes('-')) {
        _a = quantity.split('-'), minQty = _a[0], maxQty = _a[1];
    }
    if ((!quantity || quantity == '0') && !unit) {
        unit = 'q.b.';
        unitPlural = 'q.b.';
    }
    return {
        quantity: +quantity,
        unit: !!unit ? unit : null,
        unitPlural: !!unitPlural ? unitPlural : null,
        symbol: !!symbol ? symbol : null,
        ingredient: extraInfo ? ingredient + " " + extraInfo : ingredient.replace(/( )*\.( )*/g, ''),
        minQty: +minQty,
        maxQty: +maxQty,
    };
}
exports.parse = parse;
function multiLineParse(recipeString, language) {
    var ingredients = recipeString.split(/[,👉🏻👉\r\n-]/);
    var result = [];
    var i;
    for (var _i = 0, ingredients_1 = ingredients; _i < ingredients_1.length; _i++) {
        var ingredient = ingredients_1[_i];
        i = parse(ingredient, language);
        if (i['ingredient']) {
            result.push(i);
        }
    }
    return result;
}
exports.multiLineParse = multiLineParse;
function combine(ingredientArray) {
    var combinedIngredients = ingredientArray.reduce(function (acc, ingredient) {
        var _a, _b;
        var key = ingredient.ingredient + ingredient.unit; // when combining different units, remove this from the key and just use the name
        var existingIngredient = acc[key];
        if (existingIngredient) {
            return Object.assign(acc, (_a = {}, _a[key] = combineTwoIngredients(existingIngredient, ingredient), _a));
        }
        else {
            return Object.assign(acc, (_b = {}, _b[key] = ingredient, _b));
        }
    }, {});
    return Object.keys(combinedIngredients).reduce(function (acc, key) {
        var ingredient = combinedIngredients[key];
        return acc.concat(ingredient);
    }, []).sort(compareIngredients);
}
exports.combine = combine;
function prettyPrintingPress(ingredient) {
    var quantity = '';
    var unit = ingredient.unit;
    if (ingredient.quantity) {
        var _a = ingredient.quantity.split('.'), whole = _a[0], remainder = _a[1];
        if (+whole !== 0 && typeof whole !== 'undefined') {
            quantity = whole;
        }
        if (+remainder !== 0 && typeof remainder !== 'undefined') {
            var fractional = void 0;
            if (repeatingFractions_1.repeatingFractions[remainder]) {
                fractional = repeatingFractions_1.repeatingFractions[remainder];
            }
            else {
                var fraction = '0.' + remainder;
                var len = fraction.length - 2;
                var denominator = Math.pow(10, len);
                var numerator = +fraction * denominator;
                var divisor = gcd(numerator, denominator);
                numerator /= divisor;
                denominator /= divisor;
                fractional = Math.floor(numerator) + '/' + Math.floor(denominator);
            }
            quantity += quantity ? ' ' + fractional : fractional;
        }
        /* if (((+whole !== 0 && typeof remainder !== 'undefined') || +whole > 1) && unit) {
           unit = nounInflector.pluralize(unit);
         }*/
    }
    else {
        return ingredient.ingredient;
    }
    return "" + quantity + (unit ? ' ' + unit : '') + " " + ingredient.ingredient;
}
exports.prettyPrintingPress = prettyPrintingPress;
function gcd(a, b) {
    if (b < 0.0000001) {
        return a;
    }
    return gcd(b, Math.floor(a % b));
}
// TODO: Maybe change this to existingIngredients: Ingredient | Ingredient[]
function combineTwoIngredients(existingIngredients, ingredient) {
    var quantity = existingIngredients.quantity && ingredient.quantity ? (Number(existingIngredients.quantity) + Number(ingredient.quantity)).toString() : null;
    var minQty = existingIngredients.minQty && ingredient.minQty ? (Number(existingIngredients.minQty) + Number(ingredient.minQty)).toString() : null;
    var maxQty = existingIngredients.maxQty && ingredient.maxQty ? (Number(existingIngredients.maxQty) + Number(ingredient.maxQty)).toString() : null;
    return Object.assign({}, existingIngredients, { quantity: quantity, minQty: minQty, maxQty: maxQty });
}
function compareIngredients(a, b) {
    if (a.ingredient === b.ingredient) {
        return 0;
    }
    return a.ingredient < b.ingredient ? -1 : 1;
}
//# sourceMappingURL=index.js.map