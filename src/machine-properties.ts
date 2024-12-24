
/**
 * Represents the properties of a machine.
 *
 * @property {number} width - The horizontal distance of two motors, in millimeters.
 * @property {number} height - The vertical distance between motors and machine bottom, in millimeters.
 * @property {number} pulley_radius - The radius of the ball pulley, in millimeters.
 * @property {number} steps_per_revolution - Resolution of the step motor, doubled for the server declaration.
 * @property {number} paper_position - The vertical distance between motors and the paper upper edge, in millimeters.
 * @property {number} max_speed - The maximum speed of the pen, in millimeters per second.
 * @property {number} acceleration - The acceleration of the pen, in millimeters per second squared.
 * @property {number} step_multipiler - The multiplier of the step motor to allow practical use of microstepping.
 * @property {number} steps_per_millimeter - Conversion factor from steps to millimeters.
 * @property {number} millimeters_per_step - Conversion factor from millimeters to steps.
 */
const machine_properties = {
    width: 420,
    height: 600,
    pulley_radius: 16.62,
    steps_per_revolution: 400,
    paper_position: 150,
    paper_width: 210,
    paper_height: 297,
    max_speed: 20,
    acceleration: 20,
    step_multipiler: 1,

    steps_per_millimeter: 400 / (16.62 * Math.PI * 2),
    millimeters_per_step: (16.62 * Math.PI * 2) / 400,
};

export default machine_properties;
