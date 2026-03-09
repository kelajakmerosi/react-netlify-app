/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    cacheDirectory: '<rootDir>/.jest-cache',
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../shared/$1'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
};
