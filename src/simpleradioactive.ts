import { join } from "path";
import { writeFile } from "fs-extra";

/**
 * Angle alias
 */
type angle = number;

/**
 * Calls a defined callback function for each element of an iterable, and returns a new array of the results.
 * @param it The iterable being mapped.
 * @param f A function which excepts an item of `it` as a single argument. Called for every item of `it`.
 */
function* map<T, U = T>(it: Iterable<T>, f: (i: T) => U): IterableIterator<U> {
  for (const i of it) {
    yield f(i);
  }
}

/**
 * Returns a new iterable containing the first `n` elements of `it`.
 * @param it The iterable being taken from.
 * @param n The number of elements to take.
 */
function* take<T>(it: Iterable<T>, n: number): IterableIterator<T> {
  for (let i = 0; i < n; i++) {
    yield it[Symbol.iterator]().next().value;
  }
}

/**
 * Creates a new iterator containing tuples of each element of `it1` and `it2`.
 * @param it1 Iterator to be mapped to the first element of each tuple in the new iterator.
 * @param it2 Iterator to be mapped to the second element of each tuple in the new iterator.
 */
function* pairStreams<T, U>(
  it1: Iterable<T>,
  it2: Iterable<U>
): IterableIterator<[T, U]> {
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
function* createRandomNumberStream(): IterableIterator<number> {
  while (true) {
    yield Math.random();
  }
}

/**
 * Creates a stream of random θ values for points on a sphere's surface in the form of (θ, φ)
 */
function* createThetaStream(): IterableIterator<angle> {
  const pointStream = pairStreams(
    map(createRandomNumberStream(), x => x * Math.PI),
    createRandomNumberStream()
  );

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
function calculateDistance(d: number, theta: angle): number {
  return Math.sqrt(1 + d ** 2 - 2 * d * Math.cos(theta));
}

/**
 * Creates a stream the distances of similated paths.
 * @param steps The number of steps taken before calculating total distance.
 * @param thetaStream An optional stream of directions.
 */
function* createDistanceStream(
  steps: number,
  thetaStream: Iterable<angle> = createThetaStream(),
  radiusLimit = Infinity
): IterableIterator<number> {
  while (true) {
    const thetaArray = [...take(thetaStream, steps)];
    yield thetaArray.reduce((p, c) => {
      if (p >= radiusLimit) {
        return p;
      } else {
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
function* createRadiusStream(significantFigures = 3): IterableIterator<number> {
  const n = 10 ** (significantFigures - 1);
  const unit = 1 / n;
  for (let i = 1; i <= steps * n; i++) {
    yield unit * i;
  }
}

interface SimulationResults {
  radius: number;
  averageDistance: number;
  percentEscaped: number;
}

const radiusStream = createRadiusStream(significantFigures);
const thetaStram = createThetaStream();

const results = map(
  radiusStream,
  (radius): SimulationResults => {
    console.log(`Simulating at r=${radius}`);

    const distances = [
      ...take(createDistanceStream(5, thetaStram, radius), sampleSize),
    ];

    const averageDistance =
      distances.reduce((accumulated, d) => accumulated + d, 0) /
      distances.length;

    const escapedDistances = distances.filter(d => d >= radius);
    const percentEscaped = (escapedDistances.length / distances.length) * 100;

    return {
      radius,
      averageDistance,
      percentEscaped,
    };
  }
);

async function writeResults(
  results: Iterable<SimulationResults>
): Promise<void> {
  const date = new Date();
  const fileName = `data-${date.toISOString()}.json`;

  const data = {
    date,
    steps,
    sampleSize,
    significantFigures,
    results: [...results],
  };

  await writeFile(
    join(__dirname, `../results/`, fileName),
    JSON.stringify(data, null, 2)
  );
}

writeResults(results).catch(e => console.error(e));
