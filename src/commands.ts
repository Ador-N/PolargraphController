import machine_properties from './machine-properties';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PositionAB, PositionXY, getABFromXY, getXYFromAB } from './utils';

export namespace PGCommands {
    /**
     * Represents a command that can be sent to a Polargraph controller.
     * @typedef {Object} Command
     * @property {string} name - The name of the command.
     * @property {Object} args - The arguments to the command.
     */
    export function makeCommand(id: number, args: (string | number)[] = []) {
        return `C${(id / 100).toString().substring(2, 4)},${args?.join(',')}${args.length ? ',' : ''}END\n`;
    }


    /**
     * Represents a command to move the pen to a position in a Polargraph controller at the maxium speed.
     */
    export function moveTo(position: PositionXY) {
        let { a, b } = getABFromXY(position);
        return makeCommand(1, [a, b]);
    }

    /**
     * Represents a command to set the position stored in Polargraph controller.
     */
    export function setPosition(position: PositionXY) {
        let { a, b } = getABFromXY(position);
        return makeCommand(9, [a, b]);
    }



    /**
     * Represents a command for controlling the pen drop in a Polargraph controller.
     */
    export function penDown(servoPosition?: number) {
        return makeCommand(13, servoPosition ? [servoPosition] : []);
    }


    /**
     * Represents a command for controlling the pen lift in a Polargraph controller.
     */
    export function penUp(servoPosition?: number) {
        return makeCommand(14, servoPosition ? [servoPosition] : []);
    }



    /**
     * Represents a command to draw a straight line on a Polargraph controller.
     * @typedef {Object} LineCommand
     * @property {PositionXY} position - The position to draw the line to.
     */
    export function lineTo(position: PositionXY, resolution: number = 2) {
        let { a, b } = getABFromXY(position);
        return makeCommand(17, [a, b, resolution]);
    }


    export function init() {
        return `C24,${machine_properties.width},${machine_properties.height},END\nC29,${Math.round(machine_properties.pulley_radius * Math.PI * 2)},END\nC30,${machine_properties.steps_per_revolution},END\n`
            + `C31,${machine_properties.max_speed},END\nC32,${machine_properties.acceleration},END\nC37,${machine_properties.step_multipiler},END\n`;
    }

}

