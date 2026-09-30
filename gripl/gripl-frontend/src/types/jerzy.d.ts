declare module "jerzy" {
    export class Vector {
        constructor(elements: number[]);
        sort(): Vector;
        mean(): number;
        length(): number;
        dot(other: Vector): Vector;
        multiply(value: number): Vector;
        sum(): number;
        ss(): number;
    }

    export const Normality: {
        shapiroWilk(vector: Vector): { w: number; p: number };
    };
}