/* @ui5-no-wrap */

import Button from "sap/m/Button";

interface WorkerMessage {
  type: string;
  payload: unknown;
}

export function handleMessage(msg: WorkerMessage): void {
  console.log(msg.type, msg.payload);
}

export default Button;
