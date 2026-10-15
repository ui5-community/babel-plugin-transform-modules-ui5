// This fixture tests auto-detection of .view.tsx files (TypeScript JSX views).

import JSView from "sap/ui/core/mvc/JSView";
import Button from "sap/m/Button";

class MyView extends JSView {
  getControllerName(): string {
    return "fixtures.classes.MyView";
  }

  createContent(oController: object): object {
    return (
      <Button text="Press me" press={(oController as any).onPress} />
    );
  }
}
