import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest', //means that we are using TypeScript with Jest
    testEnvironment: 'node', //the environment in which the tests will run
    verbose: true, //show individual test results with the test suite hierarchy
    // collectCoverage: true, //collect coverage information
    // coverageDirectory: 'coverage', //directory where Jest should output its coverage files
    // collectCoverageFrom: [
    //     '<rootDir>/src/**/*.ts', //collect coverage from all TypeScript files in the src directory
    // ]
}

export default config;