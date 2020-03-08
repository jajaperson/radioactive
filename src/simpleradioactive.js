"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
/**
 * Calls a defined callback function for each element of an iterable, and returns a new array of the results.
 * @param it The iterable being mapped.
 * @param f A function which excepts an item of `it` as a single argument. Called for every item of `it`.
 */
function* map(it, f) {
    for (const i of it) {
        yield f(i);
    }
}
/**
 * Returns a new iterable containing the first `n` elements of `it`.
 * @param it The iterable being taken from.
 * @param n The number of elements to take.
 */
function* take(it, n) {
    for (let i = 0; i < n; i++) {
        yield it[Symbol.iterator]().next().value;
    }
}
/**
 * Creates a new iterator containing tuples of each element of `it1` and `it2`.
 * @param it1 Iterator to be mapped to the first element of each tuple in the new iterator.
 * @param it2 Iterator to be mapped to the second element of each tuple in the new iterator.
 */
function* pairStreams(it1, it2) {
    while (true) {
        yield [
            it1[Symbol.iterator]().next().value,
            it2[Symbol.iterator]().next().value,
        ];
    }
}
/**
 * Creates a stream of random numbers.
 */
function* createRandomNumberStream() {
    while (true) {
        yield Math.random();
    }
}
/**
 * Creates a stream of random θ values for points on a sphere's surface in the form of (θ, φ)
 */
function* createThetaStream() {
    const pointStream = pairStreams(map(createRandomNumberStream(), x => x * Math.PI), createRandomNumberStream());
    for (const p of pointStream) {
        if (p[1] <= Math.sin(p[0])) {
            yield p[0];
        }
    }
}
/**
 * Calculate the distance reached after a 1 unit step in the direction of theta.
 * @param d The current distance from the origin.
 * @param theta The angle made between the origin, the current point, and the destination point.
 */
function calculateDistance(d, theta) {
    return Math.sqrt(1 + Math.pow(d, 2) - 2 * d * Math.cos(theta));
}
/**
 * Creates a stream the distances of similated paths.
 * @param steps The number of steps taken before calculating total distance.
 * @param thetaStream An optional stream of directions.
 */
function* createDistanceStream(steps, thetaStream = createThetaStream(), radiusLimit = Infinity) {
    while (true) {
        const thetaArray = [...take(thetaStream, steps)];
        yield thetaArray.reduce((p, c) => {
            if (p >= radiusLimit) {
                return p;
            }
            else {
                return calculateDistance(p, c);
            }
        }, 0);
    }
}
/**
 * The number of steps before the particle decays
 */
const steps = 5;
/**
 * The sample size
 */
const sampleSize = 10000000;
/**
 * Significant figures of accuracy
 */
const significantFigures = 3;
/**
 * Creates a stream of possible radii.
 * @param significantFigures How many significant figures to produce radii to.
 */
function* createRadiusStream(significantFigures = 3) {
    const n = Math.pow(10, (significantFigures - 1));
    const unit = 1 / n;
    for (let i = 1; i <= steps * n; i++) {
        yield unit * i;
    }
}
const radiusStream = createRadiusStream(significantFigures);
const thetaStram = createThetaStream();
const results = map(radiusStream, (radius) => {
    const distances = [
        ...take(createDistanceStream(5, thetaStram, radius), sampleSize),
    ];
    const averageDistance = distances.reduce((accumulated, d) => accumulated + d, 0) /
        distances.length;
    const escapedDistances = distances.filter(d => d >= radius);
    const percentEscaped = (escapedDistances.length / distances.length) * 100;
    return {
        radius,
        averageDistance,
        percentEscaped,
    };
});
function writeResults(results) {
    return __awaiter(this, void 0, void 0, function* () {
        const date = new Date();
        const fileName = `data-${date.toISOString()}.json`;
        const data = {
            date,
            steps,
            sampleSize,
            significantFigures,
            results: [...results],
        };
        yield fs_extra_1.writeFile(path_1.join(__dirname, `../results/`, fileName), JSON.stringify(data, null, 2));
    });
}
writeResults(results).catch(e => console.error(e));
