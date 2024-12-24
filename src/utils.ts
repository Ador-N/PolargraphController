import machine_properties from './machine-properties';

/**
 * Represents the position of a pen in a Polargraph controller in AB coordinates.
 * @typedef {Object} PositionAB
 * @property {number} a - The distance between the pen and the left motor, in motor steps.
 * @property {number} b - The distance between the pen and the right motor, in motor steps.
 */
export type PositionAB = {
    a: number;
    b: number;
}

/**
 * Represents the position of a pen in a Polargraph controller in XY coordinates.
 * @typedef {Object} PositionXY
 * @property {number} x - The x-coordinate of the pen.
 * @property {number} y - The y-coordinate of the pen.
 */
export type PositionXY = {
    x: number;
    y: number;
}

export function getABFromXY({x, y}: PositionXY): PositionAB {
    x += machine_properties.width / 2;
    y += machine_properties.paper_position;
    return {
        a: Math.round(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) * machine_properties.steps_per_millimeter),
        b: Math.round(Math.sqrt(Math.pow(machine_properties.width - x, 2) + Math.pow(y, 2)) * machine_properties.steps_per_millimeter),
    };
}

export function getXYFromAB({a, b}: PositionAB): PositionXY {
    a *= machine_properties.millimeters_per_step;
    b *= machine_properties.millimeters_per_step;
    let x = (Math.pow(a, 2) - Math.pow(b, 2) + Math.pow(machine_properties.width, 2)) / (2 * machine_properties.width),
        y = Math.sqrt(Math.pow(a, 2) - Math.pow(x, 2));
    return { x: x - machine_properties.width / 2, y: y - machine_properties.paper_position };
}
