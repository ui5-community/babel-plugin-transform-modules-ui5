import Button from "sap/m/Button";

interface ControlConfig {
  text: string;
}

export function createButton(config: ControlConfig): typeof Button {
  return Button;
}

export default Button;
